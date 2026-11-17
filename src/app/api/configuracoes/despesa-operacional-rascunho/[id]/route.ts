import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";
import { TipoEvento } from "@prisma/client";
import { GNDS_VALIDOS } from "@/lib/configuracoes/rascunhoDespesaOperacional";

const updateSchema = z.object({
  gnd: z.enum(GNDS_VALIDOS),
  titulo: z.string().min(1),
  objeto: z.string().optional(),
  objetivo: z.string().optional(),
  finalidade: z.string().optional(),
  memoriaCalculo: z.string().optional(),
  ordem: z.number().int().optional(),
});

// PUT: só SUPER_ADMIN pode editar um rascunho existente.
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
        { error: "Sem permissão para editar rascunhos de despesa operacional" },
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

    const existente = await prisma.rascunhoDespesaOperacional.findUnique({ where: { id } });
    if (!existente) {
      return NextResponse.json({ error: "Rascunho não encontrado" }, { status: 404 });
    }

    const data = validation.data;
    const rascunho = await prisma.rascunhoDespesaOperacional.update({
      where: { id },
      data: { ...data, updatedBy: currentUser.userId },
    });

    await prisma.auditoriaLog.create({
      data: {
        tipoEvento: TipoEvento.EDICAO,
        descricao: `Rascunho de despesa operacional "${data.titulo}" (${data.gnd}) atualizado`,
        usuarioId: currentUser.userId,
        metadados: { rascunhoId: id, gnd: data.gnd, titulo: data.titulo },
      },
    });

    return NextResponse.json(rascunho);
  } catch (error) {
    console.error("Update rascunho de despesa operacional error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

// DELETE: só SUPER_ADMIN pode remover um rascunho.
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
        { error: "Sem permissão para editar rascunhos de despesa operacional" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const existente = await prisma.rascunhoDespesaOperacional.findUnique({ where: { id } });
    if (!existente) {
      return NextResponse.json({ error: "Rascunho não encontrado" }, { status: 404 });
    }

    await prisma.rascunhoDespesaOperacional.delete({ where: { id } });

    await prisma.auditoriaLog.create({
      data: {
        tipoEvento: TipoEvento.EDICAO,
        descricao: `Rascunho de despesa operacional "${existente.titulo}" (${existente.gnd}) removido`,
        usuarioId: currentUser.userId,
        metadados: { rascunhoId: id, gnd: existente.gnd, titulo: existente.titulo },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete rascunho de despesa operacional error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
