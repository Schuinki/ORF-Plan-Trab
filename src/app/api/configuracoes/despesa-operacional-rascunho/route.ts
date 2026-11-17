import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";
import { TipoEvento } from "@prisma/client";
import { GNDS_VALIDOS } from "@/lib/configuracoes/rascunhoDespesaOperacional";

// GET: qualquer usuário autenticado pode ler os rascunhos — servem de
// pré-preenchimento para todo mundo que cria uma despesa operacional.
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const gnd = searchParams.get("gnd");

    const rascunhos = await prisma.rascunhoDespesaOperacional.findMany({
      where: gnd ? { gnd } : {},
      orderBy: [{ gnd: "asc" }, { ordem: "asc" }, { titulo: "asc" }],
    });

    return NextResponse.json(rascunhos);
  } catch (error) {
    console.error("Get rascunhos de despesa operacional error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

const createSchema = z.object({
  gnd: z.enum(GNDS_VALIDOS),
  titulo: z.string().min(1),
  objeto: z.string().optional(),
  objetivo: z.string().optional(),
  finalidade: z.string().optional(),
  memoriaCalculo: z.string().optional(),
  ordem: z.number().int().optional(),
});

// POST: só SUPER_ADMIN pode criar um novo modelo de rascunho.
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const validation = createSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: validation.error.errors },
        { status: 400 }
      );
    }

    const data = validation.data;

    const rascunho = await prisma.rascunhoDespesaOperacional.create({
      data: {
        ...data,
        updatedBy: currentUser.userId,
      },
    });

    await prisma.auditoriaLog.create({
      data: {
        tipoEvento: TipoEvento.CRIACAO,
        descricao: `Rascunho de despesa operacional "${data.titulo}" (${data.gnd}) criado`,
        usuarioId: currentUser.userId,
        metadados: { rascunhoId: rascunho.id, gnd: data.gnd, titulo: data.titulo },
      },
    });

    return NextResponse.json(rascunho, { status: 201 });
  } catch (error) {
    console.error("Create rascunho de despesa operacional error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
