import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";
import { SituacaoPregao } from "@prisma/client";
import { autoAdicionarParticipante } from "@/lib/services/omParticipante";
import { canUserActOnOm } from "@/lib/validators/om-participante";

const naturezaValorSchema = z.object({
  naturezaId: z.string().cuid("ID de natureza inválido"),
  valor: z.number().min(0),
});

const createDespesaOperacionalSchema = z.object({
  omDestinoId: z.string().cuid("ID de OM destino inválido"),
  omCompradoraId: z.string().cuid("ID de OM compradora inválido"),
  titulo: z.string().min(1, "Título é obrigatório"),
  objeto: z.string().optional(),
  objetivo: z.string().optional(),
  finalidade: z.string().optional(),
  memoriaCalculo: z.string().min(1, "Memória de cálculo é obrigatória"),
  pregaoUasg: z.string().optional(),
  situacaoPregao: z.nativeEnum(SituacaoPregao).optional(),
  observacaoPregao: z.string().optional(),
  naturezas: z
    .array(naturezaValorSchema)
    .min(1, "Informe ao menos uma Natureza de Despesa"),
});

const despesaOperacionalInclude = {
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
  naturezas: {
    include: {
      natureza: {
        select: {
          id: true,
          codigo: true,
          nome: true,
          gnd: true,
        },
      },
    },
  },
} as const;

async function recalcularTotal(planoTrabalhoId: string) {
  const total = await prisma.despesaOperacionalNatureza.aggregate({
    where: { despesaOperacional: { planoTrabalhoId } },
    _sum: { valor: true },
  });

  await prisma.planoTrabalho.update({
    where: { id: planoTrabalhoId },
    data: { valorTotalDespesas: total._sum.valor || 0 },
  });
}

/**
 * GET /api/planos/[id]/despesas-operacionais
 * Lista todas as despesas de um plano OPERACIONAL_GND3
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

    if (plano.tipo !== "OPERACIONAL_GND3" && plano.tipo !== "OPERACIONAL_GND4") {
      return NextResponse.json(
        {
          error:
            "Despesas operacionais só estão disponíveis para planos Operacionais",
        },
        { status: 400 }
      );
    }

    const despesas = await prisma.despesaOperacional.findMany({
      where: { planoTrabalhoId: id },
      include: despesaOperacionalInclude,
      orderBy: [{ omDestino: { sigla: "asc" } }, { createdAt: "asc" }],
    });

    return NextResponse.json(despesas);
  } catch (error) {
    console.error("Get despesas operacionais error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/planos/[id]/despesas-operacionais
 * Cria uma nova despesa operacional (apenas para planos OPERACIONAL_GND3)
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

    const plano = await prisma.planoTrabalho.findUnique({
      where: { id },
    });

    if (!plano) {
      return NextResponse.json(
        { error: "Plano de trabalho não encontrado" },
        { status: 404 }
      );
    }

    if (plano.tipo !== "OPERACIONAL_GND3" && plano.tipo !== "OPERACIONAL_GND4") {
      return NextResponse.json(
        {
          error:
            "Despesas operacionais só podem ser criadas em planos Operacionais",
        },
        { status: 400 }
      );
    }

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
        { error: "Você só pode lançar despesas em Planos de Trabalho da sua OM" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = createDespesaOperacionalSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: validation.error.errors },
        { status: 400 }
      );
    }

    const {
      omDestinoId,
      omCompradoraId,
      titulo,
      objeto,
      objetivo,
      finalidade,
      memoriaCalculo,
      pregaoUasg,
      situacaoPregao,
      observacaoPregao,
      naturezas,
    } = validation.data;

    const omCompradoraExiste = await prisma.organizacaoMilitar.findUnique({
      where: { id: omCompradoraId },
      select: { id: true },
    });
    if (!omCompradoraExiste) {
      return NextResponse.json(
        { error: "OM compradora não encontrada" },
        { status: 404 }
      );
    }

    // Validar que não há natureza repetida
    const naturezaIds = naturezas.map((n) => n.naturezaId);
    if (new Set(naturezaIds).size !== naturezaIds.length) {
      return NextResponse.json(
        { error: "Há Naturezas de Despesa repetidas" },
        { status: 400 }
      );
    }

    // Validar que ao menos uma natureza tem valor > 0
    const somaValores = naturezas.reduce((sum, n) => sum + n.valor, 0);
    if (somaValores <= 0) {
      return NextResponse.json(
        { error: "Informe ao menos uma Natureza de Despesa com valor maior que zero" },
        { status: 400 }
      );
    }

    // Validar que todas as naturezas existem
    const naturezasExistentes = await prisma.naturezaDespesa.findMany({
      where: { id: { in: naturezaIds } },
    });

    if (naturezasExistentes.length !== naturezaIds.length) {
      return NextResponse.json(
        { error: "Uma ou mais Naturezas de Despesa não foram encontradas" },
        { status: 404 }
      );
    }

    // O tipo do plano fixa o GND de todas as naturezas que ele pode conter
    // (OPERACIONAL_GND3 só aceita GND 3, OPERACIONAL_GND4 só aceita GND 4).
    const gndEsperado = plano.tipo === "OPERACIONAL_GND4" ? "GND 4" : "GND 3";
    const naturezasForaDoGnd = naturezasExistentes.filter(
      (nat) => nat.gnd !== gndEsperado
    );
    if (naturezasForaDoGnd.length > 0) {
      return NextResponse.json(
        {
          error: `Naturezas de GND diferente de ${gndEsperado} não são permitidas neste plano: ${naturezasForaDoGnd
            .map((nat) => nat.codigo)
            .join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Se a OM destino ainda não participa da operação, adiciona-a
    // automaticamente (teto R$ 0) em vez de rejeitar a despesa.
    const { despesaOperacional, omsAdicionadas } = await prisma.$transaction(
      async (tx) => {
        const omsAdicionadas: { id: string; sigla: string }[] = [];
        const { criado } = await autoAdicionarParticipante(
          tx,
          plano.operacaoId,
          omDestinoId
        );
        if (criado) {
          const om = await tx.organizacaoMilitar.findUnique({
            where: { id: omDestinoId },
            select: { id: true, sigla: true },
          });
          if (om) omsAdicionadas.push(om);
        }

        const despesaOperacional = await tx.despesaOperacional.create({
          data: {
            planoTrabalhoId: id,
            omDestinoId,
            omCompradoraId,
            titulo,
            objeto,
            objetivo,
            finalidade,
            memoriaCalculo,
            pregaoUasg,
            situacaoPregao,
            observacaoPregao,
            naturezas: {
              create: naturezas.map((n) => ({
                naturezaId: n.naturezaId,
                valor: n.valor,
              })),
            },
          },
          include: despesaOperacionalInclude,
        });

        return { despesaOperacional, omsAdicionadas };
      }
    );

    await recalcularTotal(id);

    await prisma.auditoriaLog.create({
      data: {
        tipoEvento: "CRIACAO",
        descricao: `Despesa operacional criada no plano "${plano.titulo}" - ${titulo}`,
        usuarioId: user.id,
        planoTrabalhoId: id,
        metadados: {
          despesaOperacionalId: despesaOperacional.id,
          titulo,
          somaValores,
          omsAdicionadasComoParticipantes: omsAdicionadas,
        },
      },
    });

    return NextResponse.json({ ...despesaOperacional, omsAdicionadas }, { status: 201 });
  } catch (error) {
    console.error("Create despesa operacional error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
