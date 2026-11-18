import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { TIPOS_ANEXO, TipoAnexo } from "@/lib/anexos";

const TAMANHO_MAXIMO_BYTES = 20 * 1024 * 1024; // 20 MB

// GET: lista os anexos da operação (só metadados, sem o conteúdo do arquivo).
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
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get("tipo");

    const anexos = await prisma.anexoOperacao.findMany({
      where: {
        operacaoId,
        ...(tipo ? { tipo } : {}),
      },
      select: {
        id: true,
        tipo: true,
        nomeArquivo: true,
        mimeType: true,
        tamanhoBytes: true,
        createdAt: true,
        uploadedBy: { select: { nomeCompleto: true, nomeGuerra: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(anexos);
  } catch (error) {
    console.error("Get anexos da operação error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

// POST: envia um novo documento assinado (PTrab ou DOR) para a operação.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { id: operacaoId } = await params;
    const operacao = await prisma.operacao.findUnique({ where: { id: operacaoId } });
    if (!operacao) {
      return NextResponse.json({ error: "Operação não encontrada" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const tipo = String(formData.get("tipo") || "");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Arquivo não enviado" }, { status: 400 });
    }
    if (!TIPOS_ANEXO.includes(tipo as TipoAnexo)) {
      return NextResponse.json({ error: "Tipo de anexo inválido" }, { status: 400 });
    }
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Envie o documento assinado em PDF" }, { status: 400 });
    }
    if (file.size > TAMANHO_MAXIMO_BYTES) {
      return NextResponse.json(
        { error: "Arquivo muito grande (máximo 20 MB)" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const anexo = await prisma.anexoOperacao.create({
      data: {
        operacaoId,
        tipo,
        nomeArquivo: file.name,
        mimeType: "application/pdf",
        tamanhoBytes: buffer.byteLength,
        conteudo: buffer,
        uploadedById: currentUser.userId,
      },
      select: {
        id: true,
        tipo: true,
        nomeArquivo: true,
        mimeType: true,
        tamanhoBytes: true,
        createdAt: true,
        uploadedBy: { select: { nomeCompleto: true, nomeGuerra: true } },
      },
    });

    return NextResponse.json(anexo, { status: 201 });
  } catch (error) {
    console.error("Upload de anexo da operação error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
