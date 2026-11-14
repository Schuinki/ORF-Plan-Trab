import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";
import { autoAdicionarParticipante } from "@/lib/services/omParticipante";

const updateItemMunicaoSchema = z.object({
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
 * DELETE /api/planos/[id]/itens-municao/[itemId]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { id, itemId } = await params;
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const item = await prisma.itemMunicao.findFirst({
      where: { id: itemId, planoTrabalhoId: id },
      include: { planoTrabalho: true },
    });

    if (!item) {
      return NextResponse.json({ error: "Item não encontrado" }, { status: 404 });
    }

    if (
      item.planoTrabalho.status === "EM_ANALISE" ||
      item.planoTrabalho.status === "APROVADO"
    ) {
      return NextResponse.json(
        {
          error:
            item.planoTrabalho.status === "EM_ANALISE"
              ? "Plano em análise não pode ter itens removidos. Aguardando aprovação."
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
      if (user.omId !== item.planoTrabalho.omId) {
        return NextResponse.json(
          { error: "Você só pode excluir itens de planos da sua OM" },
          { status: 403 }
        );
      }

      if (
        item.planoTrabalho.responsavelId !== user.id &&
        !["S4", "COMANDANTE"].includes(user.role)
      ) {
        return NextResponse.json(
          { error: "Sem permissão para excluir este item" },
          { status: 403 }
        );
      }
    }

    await prisma.itemMunicao.delete({ where: { id: itemId } });

    await prisma.auditoriaLog.create({
      data: {
        tipoEvento: "EDICAO",
        descricao: `Item de munição excluído do plano "${item.planoTrabalho.titulo}"`,
        usuarioId: user.id,
        planoTrabalhoId: id,
        metadados: { itemMunicaoId: itemId, tipo: item.tipo },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete item de munição error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/planos/[id]/itens-municao/[itemId]
 * Substitui completamente os dados de um item de munição
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { id, itemId } = await params;
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const item = await prisma.itemMunicao.findFirst({
      where: { id: itemId, planoTrabalhoId: id },
      include: { planoTrabalho: true },
    });

    if (!item) {
      return NextResponse.json({ error: "Item não encontrado" }, { status: 404 });
    }

    if (
      item.planoTrabalho.status === "EM_ANALISE" ||
      item.planoTrabalho.status === "APROVADO"
    ) {
      return NextResponse.json(
        {
          error:
            item.planoTrabalho.status === "EM_ANALISE"
              ? "Plano em análise não pode ter itens alterados. Aguardando aprovação."
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
    const validation = updateItemMunicaoSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: validation.error.errors },
        { status: 400 }
      );
    }

    const { omId, neeNsn, tipo, quantidade, memoria } = validation.data;

    const { itemAtualizado, omsAdicionadas } = await prisma.$transaction(
      async (tx) => {
        const omsAdicionadas: { id: string; sigla: string }[] = [];
        const { criado } = await autoAdicionarParticipante(
          tx,
          item.planoTrabalho.operacaoId,
          omId
        );
        if (criado) {
          const om = await tx.organizacaoMilitar.findUnique({
            where: { id: omId },
            select: { id: true, sigla: true },
          });
          if (om) omsAdicionadas.push(om);
        }

        const itemAtualizado = await tx.itemMunicao.update({
          where: { id: itemId },
          data: { omId, neeNsn, tipo, quantidade, memoria },
          include: itemMunicaoInclude,
        });

        return { itemAtualizado, omsAdicionadas };
      }
    );

    await prisma.auditoriaLog.create({
      data: {
        tipoEvento: "EDICAO",
        descricao: `Item de munição atualizado no plano "${item.planoTrabalho.titulo}"`,
        usuarioId: user.id,
        planoTrabalhoId: id,
        metadados: {
          itemMunicaoId: itemId,
          tipo,
          omsAdicionadasComoParticipantes: omsAdicionadas,
        },
      },
    });

    return NextResponse.json({ ...itemAtualizado, omsAdicionadas });
  } catch (error) {
    console.error("Update item de munição error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
