import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";

const updateArtigoSchema = z.object({
  titulo: z.string().min(1, "Título é obrigatório"),
  categoria: z.enum(["PREGAO", "COMPRASNET", "REGULAMENTO", "OUTRO"]),
  conteudo: z.string().min(1, "Conteúdo é obrigatório"),
});

async function requireAdmin(currentUser: { userId: string }) {
  const user = await prisma.user.findUnique({ where: { id: currentUser.userId } });
  if (!user) return { error: "Usuário não encontrado", status: 404 } as const;
  if (user.role !== "SUPER_ADMIN") {
    return {
      error: "Só o administrador pode gerenciar artigos de consulta",
      status: 403,
    } as const;
  }
  return { user } as const;
}

/** GET /api/consulta/[id] — qualquer autenticado */
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

    const artigo = await prisma.artigoConsulta.findUnique({
      where: { id },
      include: {
        autor: {
          select: { nomeCompleto: true, nomeGuerra: true, postoGraduacao: true },
        },
      },
    });

    if (!artigo) {
      return NextResponse.json(
        { error: "Artigo não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(artigo);
  } catch (error) {
    console.error("Get artigo consulta error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

/** PUT /api/consulta/[id] — só SUPER_ADMIN */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const check = await requireAdmin(currentUser);
    if ("error" in check) {
      return NextResponse.json({ error: check.error }, { status: check.status });
    }

    const body = await request.json();
    const validation = updateArtigoSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: validation.error.errors },
        { status: 400 }
      );
    }

    const artigo = await prisma.artigoConsulta.update({
      where: { id },
      data: validation.data,
    });

    return NextResponse.json(artigo);
  } catch (error) {
    console.error("Update artigo consulta error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

/** DELETE /api/consulta/[id] — só SUPER_ADMIN */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const check = await requireAdmin(currentUser);
    if ("error" in check) {
      return NextResponse.json({ error: check.error }, { status: check.status });
    }

    await prisma.artigoConsulta.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete artigo consulta error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
