import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { id: operacaoId } = await params;

    // Busca todos os planos de trabalho da operação
    const planos = await prisma.planoTrabalho.findMany({
      where: {
        operacaoId,
      },
      include: {
        om: true,
        operacao: true,
        responsavel: true,
        despesas: {
          include: {
            classe: true,
            tipo: true,
            oms: { include: { omDestino: true, omCompradora: true } },
            despesasNaturezas: { include: { natureza: true } },
          },
        },
        despesasOperacionais: {
          include: {
            omDestino: true,
            omCompradora: true,
            naturezas: { include: { natureza: true } },
          },
        },
        itensRacaoR2: { include: { om: true } },
        itensMunicao: { include: { om: true } },
      },
      orderBy: [{ om: { sigla: "asc" } }, { tipo: "asc" }],
    });

    // Busca a operação com suas relações
    const operacao = await prisma.operacao.findUnique({
      where: { id: operacaoId },
      include: {
        om: true,
        omsParticipantes: {
          include: {
            om: { select: { sigla: true, codUG: true } },
          },
        },
      },
    });

    if (!operacao) {
      return NextResponse.json(
        { error: "Operação não encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      planos,
      operacao,
    });
  } catch (error) {
    console.error("Erro ao buscar planos da operação:", error);
    return NextResponse.json(
      { error: "Erro ao buscar planos da operação" },
      { status: 500 }
    );
  }
}
