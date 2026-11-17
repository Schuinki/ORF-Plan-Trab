import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// GET: baixa/visualiza o conteúdo do anexo (o PDF em si).
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; anexoId: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { id: operacaoId, anexoId } = await params;
    const anexo = await prisma.anexoOperacao.findUnique({ where: { id: anexoId } });
    if (!anexo || anexo.operacaoId !== operacaoId) {
      return NextResponse.json({ error: "Anexo não encontrado" }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(anexo.conteudo), {
      headers: {
        "Content-Type": anexo.mimeType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(anexo.nomeArquivo)}"`,
        "Content-Length": String(anexo.tamanhoBytes),
      },
    });
  } catch (error) {
    console.error("Download de anexo da operação error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

// DELETE: remove o anexo — só quem enviou ou um SUPER_ADMIN.
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; anexoId: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { id: operacaoId, anexoId } = await params;
    const anexo = await prisma.anexoOperacao.findUnique({ where: { id: anexoId } });
    if (!anexo || anexo.operacaoId !== operacaoId) {
      return NextResponse.json({ error: "Anexo não encontrado" }, { status: 404 });
    }

    if (anexo.uploadedById !== currentUser.userId && currentUser.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Só quem enviou o documento (ou um administrador) pode removê-lo" },
        { status: 403 }
      );
    }

    await prisma.anexoOperacao.delete({ where: { id: anexoId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Excluir anexo da operação error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
