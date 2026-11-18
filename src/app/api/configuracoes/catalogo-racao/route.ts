import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";
import { TipoEvento } from "@prisma/client";

// GET: qualquer usuário autenticado pode ler o catálogo — serve de opção
// pré-definida para todo mundo que lança um item de ração.
export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const itens = await prisma.catalogoItemRacao.findMany({
      orderBy: [{ ordem: "asc" }, { item: "asc" }],
    });

    return NextResponse.json(itens);
  } catch (error) {
    console.error("Get catálogo de ração error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

const createSchema = z.object({
  item: z.string().min(1, "Item é obrigatório"),
  ordem: z.number().int().optional(),
});

// POST: só SUPER_ADMIN pode adicionar um item ao catálogo.
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    if (currentUser.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Sem permissão para editar o catálogo de ração" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = createSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: validation.error.errors },
        { status: 400 }
      );
    }

    const data = validation.data;

    const existente = await prisma.catalogoItemRacao.findUnique({
      where: { item: data.item },
    });
    if (existente) {
      return NextResponse.json(
        { error: "Já existe um item com este nome no catálogo" },
        { status: 400 }
      );
    }

    const item = await prisma.catalogoItemRacao.create({
      data: { ...data, updatedBy: currentUser.userId },
    });

    await prisma.auditoriaLog.create({
      data: {
        tipoEvento: TipoEvento.CRIACAO,
        descricao: `Item "${data.item}" adicionado ao catálogo de ração`,
        usuarioId: currentUser.userId,
        metadados: { itemId: item.id, item: data.item },
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("Create catálogo de ração error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
