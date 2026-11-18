import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canCreatePlanoTrabalho } from "@/lib/permissions";
import {
  getTodasOmsSubordinadas,
  canUserActOnOm,
} from "@/lib/validators/om-participante";
import { z } from "zod";
import { StatusPlano, TipoEvento, TipoPlano } from "@prisma/client";

const createPlanoSchema = z.object({
  operacaoId: z.string().cuid("ID de operação inválido"),
  titulo: z.string().min(1, "Título é obrigatório"),
  omId: z.string().cuid("ID de OM inválido").optional(),
  tipo: z.nativeEnum(TipoPlano).default(TipoPlano.LOGISTICO),
});

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const operacaoId = searchParams.get("operacaoId");

    const user = await prisma.user.findUnique({
      where: { id: currentUser.userId },
      include: { om: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    const whereClause: any = {};

    if (operacaoId) {
      whereClause.operacaoId = operacaoId;
    }

    // Filtrar por OM se não for role que vê tudo
    if (!["SUPER_ADMIN"].includes(user.role)) {
      // Buscar OMs subordinadas ao usuário
      const subordinadas = await getTodasOmsSubordinadas(user.omId);
      const omsIds = [user.omId, ...subordinadas.map((s) => s.id)];

      // Usuário vê planos da sua OM ou de OMs subordinadas
      whereClause.omId = { in: omsIds };
    }

    const planos = await prisma.planoTrabalho.findMany({
      where: whereClause,
      include: {
        operacao: {
          include: {
            om: {
              select: {
                id: true,
                nome: true,
                sigla: true,
                tipo: true,
              },
            },
            omsParticipantes: {
              include: {
                om: {
                  select: {
                    id: true,
                    nome: true,
                    sigla: true,
                  },
                },
              },
            },
          },
        },
        om: {
          select: {
            id: true,
            nome: true,
            sigla: true,
            tipo: true,
          },
        },
        responsavel: {
          select: {
            id: true,
            nomeCompleto: true,
            nomeGuerra: true,
            postoGraduacao: true,
          },
        },
        despesas: {
          select: {
            id: true,
            valorCalculado: true,
          },
        },
        _count: {
          select: {
            despesas: true,
            documentosReferencia: true,
            anotacoes: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(planos);
  } catch (error) {
    console.error("Get planos error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: currentUser.userId },
    });

    if (!user || !canCreatePlanoTrabalho(user.role)) {
      return NextResponse.json(
        { error: "Sem permissão para criar plano de trabalho" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = createPlanoSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: validation.error.errors },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Verificar se operação existe
    const operacao = await prisma.operacao.findUnique({
      where: { id: data.operacaoId },
      include: {
        omsParticipantes: true,
      },
    });

    if (!operacao) {
      return NextResponse.json(
        { error: "Operação não encontrada" },
        { status: 404 }
      );
    }

    // Cada OM só pode criar Ptrab em nome de si mesma ou de uma OM
    // subordinada na hierarquia (ex.: S4 de um Comando lançando o Ptrab de
    // uma unidade subordinada sem acesso próprio ao sistema). Apenas
    // SUPER_ADMIN pode criar em nome de qualquer outra OM participante.
    const omAlvo = data.omId || user.omId;
    if (!(await canUserActOnOm(user.role, user.omId, omAlvo))) {
      return NextResponse.json(
        { error: "Você só pode criar Planos de Trabalho em nome da sua OM ou de uma OM subordinada" },
        { status: 403 }
      );
    }

    const omParticipa = operacao.omsParticipantes.some(
      (p) => p.omId === omAlvo
    );
    if (!omParticipa) {
      return NextResponse.json(
        { error: "A OM informada não participa desta operação" },
        { status: 400 }
      );
    }

    // Uma OM pode ter mais de um plano do mesmo tipo na mesma operação
    // (ex.: revisões, frentes de despesa separadas). Sem bloqueio aqui.

    // Obter próxima versão (global para a operação, para histórico)
    const lastVersion = await prisma.planoTrabalho.findFirst({
      where: { operacaoId: data.operacaoId },
      orderBy: { versao: "desc" },
      select: { versao: true },
    });

    const nextVersion = lastVersion ? lastVersion.versao + 1 : 1;

    // Criar plano vinculado à OM do usuário
    const plano = await prisma.planoTrabalho.create({
      data: {
        titulo: data.titulo,
        versao: nextVersion,
        operacaoId: data.operacaoId,
        omId: data.omId || user.omId,
        responsavelId: user.id,
        status: StatusPlano.RASCUNHO,
        tipo: data.tipo,
      },
      include: {
        operacao: {
          include: {
            om: true,
            omsParticipantes: {
              include: {
                om: true,
              },
            },
          },
        },
        om: true,
        responsavel: {
          select: {
            id: true,
            nomeCompleto: true,
            nomeGuerra: true,
            postoGraduacao: true,
          },
        },
      },
    });

    // Log de auditoria
    await prisma.auditoriaLog.create({
      data: {
        tipoEvento: TipoEvento.CRIACAO,
        descricao: `Plano de Trabalho "${plano.titulo}" criado (v${plano.versao})`,
        usuarioId: user.id,
        planoTrabalhoId: plano.id,
        operacaoId: plano.operacaoId,
        metadados: {
          plano: {
            titulo: plano.titulo,
            versao: plano.versao,
          },
        },
      },
    });

    return NextResponse.json(plano, { status: 201 });
  } catch (error) {
    console.error("Create plano error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
