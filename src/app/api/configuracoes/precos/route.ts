import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";
import { ClasseDespesa, TipoEvento } from "@prisma/client";
import { chaveConhecida, encontrarGrupoRegistro } from "@/lib/configuracoes/registroPrecos";

// GET: qualquer usuário autenticado pode ler (os preços efetivos valem para
// os cálculos de despesa de todo mundo, não só de quem administra).
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const classe = searchParams.get("classe");
    const grupo = searchParams.get("grupo");

    const configuracoes = await prisma.configuracaoPreco.findMany({
      where: {
        ...(classe ? { classe: classe as ClasseDespesa } : {}),
        ...(grupo ? { grupo } : {}),
      },
      orderBy: [{ classe: "asc" }, { grupo: "asc" }, { chave: "asc" }],
    });

    return NextResponse.json(configuracoes);
  } catch (error) {
    console.error("Get configuracoes de preco error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

const upsertSchema = z.object({
  classe: z.nativeEnum(ClasseDespesa),
  grupo: z.string().min(1),
  chave: z.string().min(1),
  nome: z.string().min(1),
  dados: z.record(z.number().finite().min(0)),
});

// PUT: só SUPER_ADMIN pode criar/atualizar um override de preço.
export async function PUT(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    if (currentUser.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Sem permissão para editar preços" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = upsertSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: validation.error.errors },
        { status: 400 }
      );
    }

    const data = validation.data;

    const grupoRegistro = encontrarGrupoRegistro(data.classe, data.grupo);
    if (!grupoRegistro || !chaveConhecida(data.classe, data.grupo, data.chave)) {
      return NextResponse.json(
        { error: "Classe/grupo/chave de preço desconhecida" },
        { status: 400 }
      );
    }

    const camposValidos = new Set(grupoRegistro.campos.map((c) => c.campo));
    const camposInvalidos = Object.keys(data.dados).filter(
      (campo) => !camposValidos.has(campo)
    );
    if (camposInvalidos.length > 0) {
      return NextResponse.json(
        { error: `Campos não editáveis: ${camposInvalidos.join(", ")}` },
        { status: 400 }
      );
    }

    const configuracao = await prisma.configuracaoPreco.upsert({
      where: {
        classe_grupo_chave: {
          classe: data.classe,
          grupo: data.grupo,
          chave: data.chave,
        },
      },
      update: {
        nome: data.nome,
        dados: data.dados,
        updatedBy: currentUser.userId,
      },
      create: {
        classe: data.classe,
        grupo: data.grupo,
        chave: data.chave,
        nome: data.nome,
        dados: data.dados,
        updatedBy: currentUser.userId,
      },
    });

    await prisma.auditoriaLog.create({
      data: {
        tipoEvento: TipoEvento.EDICAO,
        descricao: `Preço customizado para "${data.nome}" (${data.classe}/${data.grupo}) atualizado`,
        usuarioId: currentUser.userId,
        metadados: { classe: data.classe, grupo: data.grupo, chave: data.chave, dados: data.dados },
      },
    });

    return NextResponse.json(configuracao);
  } catch (error) {
    console.error("Upsert configuracao de preco error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

const deleteSchema = z.object({
  classe: z.nativeEnum(ClasseDespesa),
  grupo: z.string().min(1),
  chave: z.string().min(1),
});

// DELETE: só SUPER_ADMIN pode restaurar um item ao valor padrão (remove o override).
export async function DELETE(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    if (currentUser.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Sem permissão para editar preços" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const validation = deleteSchema.safeParse({
      classe: searchParams.get("classe"),
      grupo: searchParams.get("grupo"),
      chave: searchParams.get("chave"),
    });

    if (!validation.success) {
      return NextResponse.json(
        { error: "Parâmetros inválidos", details: validation.error.errors },
        { status: 400 }
      );
    }

    const data = validation.data;

    const existente = await prisma.configuracaoPreco.findUnique({
      where: {
        classe_grupo_chave: {
          classe: data.classe,
          grupo: data.grupo,
          chave: data.chave,
        },
      },
    });

    if (!existente) {
      return NextResponse.json({ error: "Override não encontrado" }, { status: 404 });
    }

    await prisma.configuracaoPreco.delete({ where: { id: existente.id } });

    await prisma.auditoriaLog.create({
      data: {
        tipoEvento: TipoEvento.EDICAO,
        descricao: `Preço customizado para "${existente.nome}" (${data.classe}/${data.grupo}) restaurado ao padrão`,
        usuarioId: currentUser.userId,
        metadados: { classe: data.classe, grupo: data.grupo, chave: data.chave },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete configuracao de preco error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
