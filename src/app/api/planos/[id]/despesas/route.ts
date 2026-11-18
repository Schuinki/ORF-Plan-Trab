import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { calcularDespesa } from "@/lib/calculos-despesas";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { autoAdicionarParticipante } from "@/lib/services/omParticipante";
import { canUserActOnOm } from "@/lib/validators/om-participante";

const rateioOMSchema = z.object({
  omDestinoId: z.string().cuid("ID de OM destino inválido"),
  omCompradoraId: z.string().cuid("ID de OM compradora inválido"),
  percentual: z.number().min(0.01).max(100),
});

const rateioNaturezaSchema = z.object({
  naturezaId: z.string().cuid("ID de natureza inválido"),
  percentual: z.number().min(0.01).max(100),
});

const createDespesaSchema = z.object({
  classeId: z.string().cuid("ID de classe inválido"),
  tipoId: z.string().cuid("ID de tipo inválido").nullable().optional(),
  valorTotal: z.number().min(0),
  valorCombustivel: z.number().optional(),
  descricao: z.string().min(1, "Descrição é obrigatória"),
  naturezas: z
    .array(rateioNaturezaSchema)
    .min(1, "Selecione ao menos uma natureza"),
  parametros: z.any(), // JSON com parâmetros específicos da classe
  oms: z.array(rateioOMSchema).min(1, "Selecione ao menos uma OM"),
});

/**
 * GET /api/planos/[id]/despesas
 * Lista todas as despesas de um plano LOGISTICO
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

    // Verificar se plano existe e é LOGISTICO
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

    if (plano.tipo !== "LOGISTICO") {
      return NextResponse.json(
        { error: "Despesas só estão disponíveis para planos LOGISTICO" },
        { status: 400 }
      );
    }

    // Buscar despesas
    const despesas = await prisma.despesa.findMany({
      where: { planoTrabalhoId: id },
      include: {
        classe: {
          select: {
            id: true,
            nome: true,
            descricao: true,
          },
        },
        tipo: {
          select: {
            id: true,
            nome: true,
            isCombustivel: true,
          },
        },
        oms: {
          include: {
            omDestino: {
              select: {
                id: true,
                nome: true,
                sigla: true,
                codUG: true,
              },
            },
            omCompradora: {
              select: {
                id: true,
                nome: true,
                sigla: true,
                codUG: true,
              },
            },
          },
        },
        despesasNaturezas: {
          include: {
            natureza: {
              select: {
                id: true,
                codigo: true,
                nome: true,
                descricao: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(despesas);
  } catch (error) {
    console.error("Get despesas error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/planos/[id]/despesas
 * Cria uma nova despesa (apenas para planos LOGISTICO)
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

    // Verificar se plano existe e é LOGISTICO
    const plano = await prisma.planoTrabalho.findUnique({
      where: { id },
      include: {
        operacao: {
          include: {
            omsParticipantes: { select: { omId: true } },
          },
        },
      },
    });

    if (!plano) {
      return NextResponse.json(
        { error: "Plano de trabalho não encontrado" },
        { status: 404 }
      );
    }

    if (plano.tipo !== "LOGISTICO") {
      return NextResponse.json(
        { error: "Despesas só podem ser criadas em planos LOGISTICO" },
        { status: 400 }
      );
    }

    // Verificar bloqueio (plano em análise ou já aprovado)
    if (plano.status === "EM_ANALISE" || plano.status === "APROVADO") {
      return NextResponse.json(
        {
          error:
            plano.status === "EM_ANALISE"
              ? "Plano em análise não pode ter despesas adicionadas. Aguardando aprovação."
              : "Plano aprovado não pode ser alterado. É necessário devolvê-lo para correção.",
        },
        { status: 403 }
      );
    }

    // Verificar permissão
    const user = await prisma.user.findUnique({
      where: { id: currentUser.userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    // Só a própria OM do plano, uma OM subordinada, ou SUPER_ADMIN pode
    // lançar despesas nele.
    if (!(await canUserActOnOm(user.role, user.omId, plano.omId))) {
      return NextResponse.json(
        { error: "Você só pode lançar despesas em Planos de Trabalho da sua OM" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = createDespesaSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: validation.error.errors },
        { status: 400 }
      );
    }

    const {
      classeId,
      tipoId,
      descricao,
      naturezas,
      parametros,
      oms,
      valorTotal,
      valorCombustivel,
    } = validation.data;

    // Validar classe e tipo
    const classe = await prisma.classe.findUnique({
      where: { id: classeId },
    });

    if (!classe) {
      return NextResponse.json(
        { error: "Classe não encontrada" },
        { status: 404 }
      );
    }

    // Validar tipo apenas se foi fornecido
    let tipo = null;
    if (tipoId) {
      tipo = await prisma.tipo.findFirst({
        where: { id: tipoId, classeId: classeId },
      });

      if (!tipo) {
        return NextResponse.json(
          { error: "Tipo não encontrado ou não pertence a esta classe" },
          { status: 404 }
        );
      }
    }

    // Validar rateio de naturezas (soma deve ser 100%)
    const somaPercentuaisNaturezas = naturezas.reduce(
      (sum, nat) => sum + nat.percentual,
      0
    );
    if (Math.abs(somaPercentuaisNaturezas - 100) > 0.01) {
      return NextResponse.json(
        {
          error: `A soma dos percentuais de naturezas deve ser 100%. Soma atual: ${somaPercentuaisNaturezas}%`,
        },
        { status: 400 }
      );
    }

    // Validar que todas as naturezas existem
    const naturezaIds = naturezas.map((nat) => nat.naturezaId);
    const naturezasExistentes = await prisma.naturezaDespesa.findMany({
      where: { id: { in: naturezaIds } },
    });

    if (naturezasExistentes.length !== naturezaIds.length) {
      return NextResponse.json(
        { error: "Uma ou mais naturezas não foram encontradas" },
        { status: 404 }
      );
    }

    // Validar naturezas (devem estar nas permitidas pela classe)
    const codigosNaturezas = naturezasExistentes.map((nat) => nat.codigo);
    const naturezasInvalidas = codigosNaturezas.filter(
      (codigo) => !classe.naturezasPermitidas.includes(codigo)
    );

    if (naturezasInvalidas.length > 0) {
      return NextResponse.json(
        {
          error: `Naturezas não permitidas para esta classe: ${naturezasInvalidas.join(
            ", "
          )}`,
        },
        { status: 400 }
      );
    }

    // Plano LOGISTICO sempre implica GND 3 — rejeitar naturezas de GND 4
    const naturezasForaDoGnd = naturezasExistentes.filter(
      (nat) => nat.gnd !== "GND 3"
    );
    if (naturezasForaDoGnd.length > 0) {
      return NextResponse.json(
        {
          error: `Naturezas de GND diferente de GND 3 não são permitidas em um plano Logístico: ${naturezasForaDoGnd
            .map((nat) => nat.codigo)
            .join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Validar rateio de OMs (soma deve ser 100%)
    const somaPercentuais = oms.reduce((sum, om) => sum + om.percentual, 0);
    if (Math.abs(somaPercentuais - 100) > 0.01) {
      // Tolerância de 0.01
      return NextResponse.json(
        {
          error: `A soma dos percentuais deve ser 100%. Soma atual: ${somaPercentuais}%`,
        },
        { status: 400 }
      );
    }

    // Validar que não há OM destino repetida no rateio (cada linha deve
    // apontar para um destino distinto; a OM compradora pode repetir)
    const omDestinoIds = oms.map((om) => om.omDestinoId);
    if (new Set(omDestinoIds).size !== omDestinoIds.length) {
      return NextResponse.json(
        { error: "Há OMs destino repetidas no rateio" },
        { status: 400 }
      );
    }

    // Validar que todas as OMs (destino e compradora) existem
    const todosOmIds = Array.from(
      new Set([...omDestinoIds, ...oms.map((om) => om.omCompradoraId)])
    );
    const omsExistentes = await prisma.organizacaoMilitar.findMany({
      where: { id: { in: todosOmIds } },
    });

    if (omsExistentes.length !== todosOmIds.length) {
      return NextResponse.json(
        { error: "Uma ou mais OMs não foram encontradas" },
        { status: 404 }
      );
    }

    const omsExistentesPorId = new Map(omsExistentes.map((om) => [om.id, om]));

    // Cria a despesa e, para cada OM destino que ainda não participa da
    // operação, adiciona-a automaticamente (com teto R$ 0, a ser ajustado
    // depois) em vez de rejeitar a despesa — a OM compradora nunca precisa
    // participar, é só um detalhe de aquisição.
    const { despesa, omsAdicionadas } = await prisma.$transaction(async (tx) => {
      const omsAdicionadas: { id: string; sigla: string }[] = [];
      for (const omDestinoId of new Set(omDestinoIds)) {
        const { criado } = await autoAdicionarParticipante(
          tx,
          plano.operacaoId,
          omDestinoId
        );
        if (criado) {
          const om = omsExistentesPorId.get(omDestinoId);
          if (om) omsAdicionadas.push({ id: om.id, sigla: om.sigla });
        }
      }

      const despesa = await tx.despesa.create({
        data: {
          descricao,
          planoTrabalhoId: id,
          classeId: classeId,
          tipoId: tipoId,
          parametros: parametros,
          valorCalculado: valorTotal,
          valorCombustivel,
          oms: {
            create: oms.map((om) => ({
              omDestinoId: om.omDestinoId,
              omCompradoraId: om.omCompradoraId,
              percentual: om.percentual,
            })),
          },
          despesasNaturezas: {
            create: naturezas.map((nat) => ({
              naturezaId: nat.naturezaId,
              percentual: nat.percentual,
            })),
          },
        },
        include: {
          classe: {
            select: {
              nome: true,
              descricao: true,
            },
          },
          tipo: {
            select: {
              nome: true,
              isCombustivel: true,
            },
          },
          oms: {
            include: {
              omDestino: {
                select: {
                  id: true,
                  nome: true,
                  sigla: true,
                  codUG: true,
                },
              },
              omCompradora: {
                select: {
                  id: true,
                  nome: true,
                  sigla: true,
                  codUG: true,
                },
              },
            },
          },
          despesasNaturezas: {
            include: {
              natureza: {
                select: {
                  id: true,
                  codigo: true,
                  nome: true,
                  descricao: true,
                },
              },
            },
          },
        },
      });

      // Recalculate total for the plano
      const despesasTotal = await tx.despesa.aggregate({
        where: { planoTrabalhoId: id },
        _sum: { valorCalculado: true },
      });

      await tx.planoTrabalho.update({
        where: { id },
        data: {
          valorTotalDespesas: despesasTotal._sum.valorCalculado || 0,
        },
      });

      return { despesa, omsAdicionadas };
    });

    // Log de auditoria
    await prisma.auditoriaLog.create({
      data: {
        tipoEvento: "CRIACAO",
        descricao: `Despesa criada no plano "${plano.titulo}" - ${classe.nome}`,
        usuarioId: user.id,
        planoTrabalhoId: id,
        metadados: {
          despesaId: despesa.id,
          classe: classe.nome,
          tipo: tipo?.nome || "Sem tipo",
          valorTotal: valorTotal,
          omsAdicionadasComoParticipantes: omsAdicionadas,
        },
      },
    });

    return NextResponse.json({ ...despesa, omsAdicionadas }, { status: 201 });
  } catch (error) {
    console.error("Create despesa error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
