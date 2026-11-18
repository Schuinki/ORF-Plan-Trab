import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";
import { autoAdicionarParticipante } from "@/lib/services/omParticipante";
import { canUserActOnOm } from "@/lib/validators/om-participante";

const createItemMunicaoSchema = z.object({
  omId: z.string().cuid("ID de OM inválido"),
  neeNsn: z.string().min(1, "NEE/NSN é obrigatório"),
  tipo: z.string().min(1, "Tipo é obrigatório"),
  quantidade: z.number().int().positive("Quantidade deve ser positiva"),
  memoria: z.string().optional(),
});

const itemMunicaoInclude = {
  om: {
    select: { id: true, nome: true, sigla: true, codUG: true },
  },
} as const;

/**
 * GET /api/planos/[id]/itens-municao
 * Lista os itens de munição de um plano MUNICAO
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const plano = await prisma.planoTrabalho.findUnique({
      where: { id },
      select: { tipo: true },
    });

    if (!plano) {
      return NextResponse.json(
        { error: "Plano de trabalho não encontrado" },
        { status: 404 }
      );
    }

    if (plano.tipo !== "MUNICAO") {
      return NextResponse.json(
        { error: "Itens de munição só estão disponíveis para planos de Munição" },
        { status: 400 }
      );
    }

    const itens = await prisma.itemMunicao.findMany({
      where: { planoTrabalhoId: id },
      include: itemMunicaoInclude,
      orderBy: [{ om: { sigla: "asc" } }, { createdAt: "asc" }],
    });

    return NextResponse.json(itens);
  } catch (error) {
    console.error("Get itens de munição error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/planos/[id]/itens-municao
 * Cria um novo item de munição (apenas para planos MUNICAO)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const plano = await prisma.planoTrabalho.findUnique({ where: { id } });

    if (!plano) {
      return NextResponse.json(
        { error: "Plano de trabalho não encontrado" },
        { status: 404 }
      );
    }

    if (plano.tipo !== "MUNICAO") {
      return NextResponse.json(
        { error: "Itens de munição só podem ser criados em planos de Munição" },
        { status: 400 }
      );
    }

    if (plano.status === "EM_ANALISE" || plano.status === "APROVADO") {
      return NextResponse.json(
        {
          error:
            plano.status === "EM_ANALISE"
              ? "Plano em análise não pode ter itens adicionados. Aguardando aprovação."
              : "Plano aprovado não pode ser alterado. É necessário devolvê-lo para correção.",
        },
        { status: 403 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: currentUser.userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    if (!(await canUserActOnOm(user.role, user.omId, plano.omId))) {
      return NextResponse.json(
        { error: "Você só pode lançar itens em Planos de Trabalho da sua OM" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = createItemMunicaoSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: validation.error.errors },
        { status: 400 }
      );
    }

    const { omId, neeNsn, tipo, quantidade, memoria } = validation.data;

    const { itemMunicao, omsAdicionadas } = await prisma.$transaction(
      async (tx) => {
        const omsAdicionadas: { id: string; sigla: string }[] = [];
        const { criado } = await autoAdicionarParticipante(
          tx,
          plano.operacaoId,
          omId
        );
        if (criado) {
          const om = await tx.organizacaoMilitar.findUnique({
            where: { id: omId },
            select: { id: true, sigla: true },
          });
          if (om) omsAdicionadas.push(om);
        }

        const itemMunicao = await tx.itemMunicao.create({
          data: {
            planoTrabalhoId: id,
            omId,
            neeNsn,
            tipo,
            quantidade,
            memoria,
          },
          include: itemMunicaoInclude,
        });

        return { itemMunicao, omsAdicionadas };
      }
    );

    await prisma.auditoriaLog.create({
      data: {
        tipoEvento: "CRIACAO",
        descricao: `Item de munição criado no plano "${plano.titulo}" - ${tipo}`,
        usuarioId: user.id,
        planoTrabalhoId: id,
        metadados: {
          itemMunicaoId: itemMunicao.id,
          tipo,
          quantidade,
          omsAdicionadasComoParticipantes: omsAdicionadas,
        },
      },
    });

    return NextResponse.json(
      { ...itemMunicao, omsAdicionadas },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create item de munição error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
