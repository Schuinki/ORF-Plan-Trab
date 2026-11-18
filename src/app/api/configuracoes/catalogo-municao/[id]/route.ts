import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";
import { TipoEvento } from "@prisma/client";

const updateSchema = z.object({
  neeNsn: z.string().min(1, "NEE/NSN é obrigatório"),
  tipo: z.string().min(1, "Tipo é obrigatório"),
  ordem: z.number().int().optional(),
});

// PUT: só SUPER_ADMIN pode editar um item do catálogo.
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    if (currentUser.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Sem permissão para editar o catálogo de munição" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const validation = updateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: validation.error.errors },
        { status: 400 }
      );
    }

    const existente = await prisma.catalogoItemMunicao.findUnique({ where: { id } });
    if (!existente) {
      return NextResponse.json({ error: "Item não encontrado" }, { status: 404 });
    }

    const data = validation.data;
    const item = await prisma.catalogoItemMunicao.update({
      where: { id },
      data: { ...data, updatedBy: currentUser.userId },
    });

    await prisma.auditoriaLog.create({
      data: {
        tipoEvento: TipoEvento.EDICAO,
        descricao: `Item "${data.tipo}" (${data.neeNsn}) do catálogo de munição atualizado`,
        usuarioId: currentUser.userId,
        metadados: { itemId: id, neeNsn: data.neeNsn, tipo: data.tipo },
      },
    });

    return NextResponse.json(item);
  } catch (error) {
    console.error("Update catálogo de munição error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

// DELETE: só SUPER_ADMIN pode remover um item do catálogo.
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    if (currentUser.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Sem permissão para editar o catálogo de munição" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const existente = await prisma.catalogoItemMunicao.findUnique({ where: { id } });
    if (!existente) {
      return NextResponse.json({ error: "Item não encontrado" }, { status: 404 });
    }

    await prisma.catalogoItemMunicao.delete({ where: { id } });

    await prisma.auditoriaLog.create({
      data: {
        tipoEvento: TipoEvento.EDICAO,
        descricao: `Item "${existente.tipo}" (${existente.neeNsn}) removido do catálogo de munição`,
        usuarioId: currentUser.userId,
        metadados: { itemId: id, neeNsn: existente.neeNsn, tipo: existente.tipo },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete catálogo de munição error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
