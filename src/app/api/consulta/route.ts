import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";

const createArtigoSchema = z.object({
  titulo: z.string().min(1, "Título é obrigatório"),
  categoria: z.enum(["PREGAO", "COMPRASNET", "REGULAMENTO", "OUTRO"]),
  conteudo: z.string().min(1, "Conteúdo é obrigatório"),
});

/**
 * GET /api/consulta
 * Lista artigos de consulta. Qualquer usuário autenticado pode ler.
 */
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const categoria = request.nextUrl.searchParams.get("categoria");

    const artigos = await prisma.artigoConsulta.findMany({
      where: categoria ? { categoria } : undefined,
      select: {
        id: true,
        titulo: true,
        categoria: true,
        createdAt: true,
        updatedAt: true,
        autor: {
          select: { nomeCompleto: true, nomeGuerra: true, postoGraduacao: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(artigos);
  } catch (error) {
    console.error("Get artigos consulta error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/consulta
 * Cria um artigo de consulta. Só SUPER_ADMIN.
 */
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
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
      return NextResponse.json(
        { error: "Só o administrador pode criar artigos de consulta" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = createArtigoSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: validation.error.errors },
        { status: 400 }
      );
    }

    const artigo = await prisma.artigoConsulta.create({
      data: {
        ...validation.data,
        autorId: user.id,
      },
    });

    return NextResponse.json(artigo, { status: 201 });
  } catch (error) {
    console.error("Create artigo consulta error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
