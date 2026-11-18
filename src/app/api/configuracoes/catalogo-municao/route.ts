import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";
import { TipoEvento } from "@prisma/client";

// GET: qualquer usuário autenticado pode ler o catálogo — serve de opção
// pré-definida para todo mundo que lança um item de munição.
export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const itens = await prisma.catalogoItemMunicao.findMany({
      orderBy: [{ ordem: "asc" }, { tipo: "asc" }],
    });

    return NextResponse.json(itens);
  } catch (error) {
    console.error("Get catálogo de munição error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

const createSchema = z.object({
  neeNsn: z.string().min(1, "NEE/NSN é obrigatório"),
  tipo: z.string().min(1, "Tipo é obrigatório"),
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
        { error: "Sem permissão para editar o catálogo de munição" },
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

    const existente = await prisma.catalogoItemMunicao.findFirst({
      where: { neeNsn: data.neeNsn, tipo: data.tipo },
    });
    if (existente) {
      return NextResponse.json(
        { error: "Já existe um item com este NEE/NSN e tipo no catálogo" },
        { status: 400 }
      );
    }

    const item = await prisma.catalogoItemMunicao.create({
      data: { ...data, updatedBy: currentUser.userId },
    });

    await prisma.auditoriaLog.create({
      data: {
        tipoEvento: TipoEvento.CRIACAO,
        descricao: `Item "${data.tipo}" (${data.neeNsn}) adicionado ao catálogo de munição`,
        usuarioId: currentUser.userId,
        metadados: { itemId: item.id, neeNsn: data.neeNsn, tipo: data.tipo },
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("Create catálogo de munição error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
