import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";
import { autoAdicionarParticipante } from "@/lib/services/omParticipante";

const createItemRacaoSchema = z.object({
  omId: z.string().cuid("ID de OM inválido"),
  item: z.string().min(1, "Item é obrigatório"),
  quantidade: z.number().int().positive("Quantidade deve ser positiva"),
  memoria: z.string().optional(),
});

const itemRacaoInclude = {
  om: {
    select: { id: true, nome: true, sigla: true, codUG: true },
  },
} as const;

/**
 * GET /api/planos/[id]/itens-racao
 * Lista os itens de ração de um plano RACAO_R2
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

    if (plano.tipo !== "RACAO_R2") {
      return NextResponse.json(
        { error: "Itens de ração só estão disponíveis para planos R-2" },
        { status: 400 }
      );
    }

    const itens = await prisma.itemRacaoR2.findMany({
      where: { planoTrabalhoId: id },
      include: itemRacaoInclude,
      orderBy: [{ om: { sigla: "asc" } }, { createdAt: "asc" }],
    });

    return NextResponse.json(itens);
  } catch (error) {
    console.error("Get itens de ração error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/planos/[id]/itens-racao
 * Cria um novo item de ração (apenas para planos RACAO_R2)
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

    if (plano.tipo !== "RACAO_R2") {
      return NextResponse.json(
        { error: "Itens de ração só podem ser criados em planos R-2" },
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

    const body = await request.json();
    const validation = createItemRacaoSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: validation.error.errors },
        { status: 400 }
      );
    }

    const { omId, item, quantidade, memoria } = validation.data;

    // Se a OM ainda não participa da operação, adiciona-a automaticamente
    // (teto R$ 0) em vez de rejeitar o item — itens de ração não têm valor
    // em dinheiro, mas a OM ainda precisa constar como participante.
    const { itemRacao, omsAdicionadas } = await prisma.$transaction(
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

        const itemRacao = await tx.itemRacaoR2.create({
          data: {
            planoTrabalhoId: id,
            omId,
            item,
            quantidade,
            memoria,
          },
          include: itemRacaoInclude,
        });

        return { itemRacao, omsAdicionadas };
      }
    );

    await prisma.auditoriaLog.create({
      data: {
        tipoEvento: "CRIACAO",
        descricao: `Item de ração criado no plano "${plano.titulo}" - ${item}`,
        usuarioId: user.id,
        planoTrabalhoId: id,
        metadados: {
          itemRacaoId: itemRacao.id,
          item,
          quantidade,
          omsAdicionadasComoParticipantes: omsAdicionadas,
        },
      },
    });

    return NextResponse.json({ ...itemRacao, omsAdicionadas }, { status: 201 });
  } catch (error) {
    console.error("Create item de ração error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
