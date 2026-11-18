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

const updateDespesaOperacionalSchema = z.object({
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
 * DELETE /api/planos/[id]/despesas-operacionais/[despesaId]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; despesaId: string }> }
) {
  try {
    const { id, despesaId } = await params;
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const despesa = await prisma.despesaOperacional.findFirst({
      where: { id: despesaId, planoTrabalhoId: id },
      include: { planoTrabalho: true },
    });

    if (!despesa) {
      return NextResponse.json(
        { error: "Despesa não encontrada" },
        { status: 404 }
      );
    }

    if (
      despesa.planoTrabalho.status === "EM_ANALISE" ||
      despesa.planoTrabalho.status === "APROVADO"
    ) {
      return NextResponse.json(
        {
          error:
            despesa.planoTrabalho.status === "EM_ANALISE"
              ? "Plano em análise não pode ter despesas removidas. Aguardando aprovação."
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

    if (user.role !== "SUPER_ADMIN") {
      if (user.omId !== despesa.planoTrabalho.omId) {
        return NextResponse.json(
          { error: "Você só pode excluir despesas de planos da sua OM" },
          { status: 403 }
        );
      }

      if (
        despesa.planoTrabalho.responsavelId !== user.id &&
        !["S4", "COMANDANTE"].includes(user.role)
      ) {
        return NextResponse.json(
          { error: "Sem permissão para excluir esta despesa" },
          { status: 403 }
        );
      }
    }

    await prisma.despesaOperacional.delete({ where: { id: despesaId } });

    await recalcularTotal(id);

    await prisma.auditoriaLog.create({
      data: {
        tipoEvento: "EDICAO",
        descricao: `Despesa operacional excluída do plano "${despesa.planoTrabalho.titulo}"`,
        usuarioId: user.id,
        planoTrabalhoId: id,
        metadados: { despesaOperacionalId: despesaId, titulo: despesa.titulo },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete despesa operacional error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/planos/[id]/despesas-operacionais/[despesaId]
 * Substitui completamente os dados de uma despesa operacional
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; despesaId: string }> }
) {
  try {
    const { id, despesaId } = await params;
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const despesa = await prisma.despesaOperacional.findFirst({
      where: { id: despesaId, planoTrabalhoId: id },
      include: {
        planoTrabalho: {
          include: { operacao: true },
        },
      },
    });

    if (!despesa) {
      return NextResponse.json(
        { error: "Despesa não encontrada" },
        { status: 404 }
      );
    }

    if (
      despesa.planoTrabalho.status === "EM_ANALISE" ||
      despesa.planoTrabalho.status === "APROVADO"
    ) {
      return NextResponse.json(
        {
          error:
            despesa.planoTrabalho.status === "EM_ANALISE"
              ? "Plano em análise não pode ter despesas alteradas. Aguardando aprovação."
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

    if (!(await canUserActOnOm(user.role, user.omId, despesa.planoTrabalho.omId))) {
      return NextResponse.json(
        { error: "Você só pode alterar despesas de Planos de Trabalho da sua OM" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = updateDespesaOperacionalSchema.safeParse(body);

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

    const naturezaIds = naturezas.map((n) => n.naturezaId);
    if (new Set(naturezaIds).size !== naturezaIds.length) {
      return NextResponse.json(
        { error: "Há Naturezas de Despesa repetidas" },
        { status: 400 }
      );
    }

    const somaValores = naturezas.reduce((sum, n) => sum + n.valor, 0);
    if (somaValores <= 0) {
      return NextResponse.json(
        { error: "Informe ao menos uma Natureza de Despesa com valor maior que zero" },
        { status: 400 }
      );
    }

    const naturezasExistentes = await prisma.naturezaDespesa.findMany({
      where: { id: { in: naturezaIds } },
    });

    if (naturezasExistentes.length !== naturezaIds.length) {
      return NextResponse.json(
        { error: "Uma ou mais Naturezas de Despesa não foram encontradas" },
        { status: 404 }
      );
    }

    const gndEsperado =
      despesa.planoTrabalho.tipo === "OPERACIONAL_GND4" ? "GND 4" : "GND 3";
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

    const operacaoId = despesa.planoTrabalho.operacao.id;
    const { despesaAtualizada, omsAdicionadas } = await prisma.$transaction(
      async (tx) => {
        const omsAdicionadas: { id: string; sigla: string }[] = [];
        const { criado } = await autoAdicionarParticipante(
          tx,
          operacaoId,
          omDestinoId
        );
        if (criado) {
          const om = await tx.organizacaoMilitar.findUnique({
            where: { id: omDestinoId },
            select: { id: true, sigla: true },
          });
          if (om) omsAdicionadas.push(om);
        }

        const despesaAtualizada = await tx.despesaOperacional.update({
          where: { id: despesaId },
          data: {
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
              deleteMany: {},
              create: naturezas.map((n) => ({
                naturezaId: n.naturezaId,
                valor: n.valor,
              })),
            },
          },
          include: despesaOperacionalInclude,
        });

        return { despesaAtualizada, omsAdicionadas };
      }
    );

    await recalcularTotal(id);

    await prisma.auditoriaLog.create({
      data: {
        tipoEvento: "EDICAO",
        descricao: `Despesa operacional atualizada no plano "${despesa.planoTrabalho.titulo}"`,
        usuarioId: user.id,
        planoTrabalhoId: id,
        metadados: {
          despesaOperacionalId: despesaId,
          titulo,
          omsAdicionadasComoParticipantes: omsAdicionadas,
        },
      },
    });

    return NextResponse.json({ ...despesaAtualizada, omsAdicionadas });
  } catch (error) {
    console.error("Update despesa operacional error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
