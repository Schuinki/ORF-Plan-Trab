import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

/**
 * GET /api/organizacoes/elegiveis-participantes
 * Retorna todas as OMs elegíveis para serem participantes de operações.
 * Qualquer OM pode ser adicionada como participante, inclusive OMs fora
 * da hierarquia da CMA (ex.: COTER, CIE) — não há mais restrição de
 * hierarquia aqui.
 */
export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const organizacoes = await prisma.organizacaoMilitar.findMany({
      select: {
        id: true,
        nome: true,
        sigla: true,
        tipo: true,
        codUG: true,
        omPai: {
          select: {
            sigla: true,
            nome: true,
          },
        },
      },
      orderBy: {
        sigla: "asc",
      },
    });

    return NextResponse.json(organizacoes);
  } catch (error) {
    console.error("Get organizacoes elegiveis error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
