import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { lerArquivoImportacao } from "@/lib/xlsx/importarPlanoTrabalho";

interface ItemValidado {
  linha: number;
  tipoLinha: string;
  resumo: string;
  erros: string[];
  payload: Record<string, unknown>;
}

/**
 * POST /api/planos/[id]/importar
 * Reimporta despesas de um xlsx exportado pelo próprio sistema (round-trip).
 * FormData: file (xlsx), confirmar ("true" para gravar; ausente/false = só prévia).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const plano = await prisma.planoTrabalho.findUnique({
      where: { id },
      include: {
        operacao: {
          include: { omsParticipantes: { select: { omId: true } } },
        },
        om: true,
      },
    });

    if (!plano) {
      return NextResponse.json(
        { error: "Plano de trabalho não encontrado" },
        { status: 404 }
      );
    }

    if (plano.status !== "RASCUNHO" && plano.status !== "REPROVADO") {
      return NextResponse.json(
        {
          error:
            "Só é possível importar despesas em planos no status Rascunho ou Pendente de Correção.",
        },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const confirmar = formData.get("confirmar") === "true";

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Arquivo não enviado" },
        { status: 400 }
      );
    }

    const buffer = await file.arrayBuffer();
    const { itens, erros: errosLeitura } = await lerArquivoImportacao(
      buffer,
      plano.om.sigla,
      plano.tipo
    );

    if (itens.length === 0 && errosLeitura.length === 0) {
      return NextResponse.json(
        {
          error:
            "Nenhuma linha deste arquivo corresponde a este plano (OM/tipo diferentes).",
        },
        { status: 400 }
      );
    }

    const participantesIds = new Set(
      plano.operacao.omsParticipantes.map((p) => p.omId)
    );

    const classesCache = new Map(
      (await prisma.classe.findMany()).map((c) => [c.id, c])
    );
    const tiposCache = new Map(
      (await prisma.tipo.findMany()).map((t) => [t.id, t])
    );
    const naturezasCache = new Map(
      (await prisma.naturezaDespesa.findMany()).map((n) => [n.id, n])
    );
    const omsCache = new Map(
      (await prisma.organizacaoMilitar.findMany()).map((o) => [o.id, o])
    );

    const itensValidados: ItemValidado[] = itens.map((item) => {
      const erros: string[] = [];
      const p = item.payload;

      if (item.tipoLinha === "despesa") {
        if (plano.tipo !== "LOGISTICO") {
          erros.push("Linha de despesa logística não corresponde a este tipo de plano");
        }
        const classe = classesCache.get(String(p.classeId));
        if (!classe) erros.push("Classe não encontrada");

        if (p.tipoId) {
          const tipo = tiposCache.get(String(p.tipoId));
          if (!tipo || tipo.classeId !== p.classeId)
            erros.push("Tipo não encontrado ou não pertence à classe");
        }

        const oms = Array.isArray(p.oms)
          ? (
              p.oms as {
                omId?: string;
                omDestinoId?: string;
                omCompradoraId?: string;
                percentual: number;
              }[]
            ).map((o) => ({
              omDestinoId: o.omDestinoId || o.omId || "",
              omCompradoraId: o.omCompradoraId || o.omId || "",
              percentual: o.percentual,
            }))
          : [];
        if (oms.length === 0) erros.push("Rateio de OMs vazio");
        const somaOms = oms.reduce((s, o) => s + Number(o.percentual), 0);
        if (Math.abs(somaOms - 100) > 0.01)
          erros.push(`Soma do rateio de OMs é ${somaOms.toFixed(2)}% (esperado 100%)`);
        oms.forEach((o) => {
          if (!omsCache.has(o.omDestinoId))
            erros.push(`OM ${o.omDestinoId} não encontrada`);
          else if (!participantesIds.has(o.omDestinoId))
            erros.push(`OM ${omsCache.get(o.omDestinoId)?.sigla} não participa da operação`);
          if (!omsCache.has(o.omCompradoraId))
            erros.push(`OM compradora ${o.omCompradoraId} não encontrada`);
        });

        const naturezas = Array.isArray(p.naturezas) ? (p.naturezas as { naturezaId: string; percentual: number }[]) : [];
        if (naturezas.length === 0) erros.push("Rateio de naturezas vazio");
        const somaNaturezas = naturezas.reduce((s, n) => s + Number(n.percentual), 0);
        if (Math.abs(somaNaturezas - 100) > 0.01)
          erros.push(`Soma do rateio de naturezas é ${somaNaturezas.toFixed(2)}% (esperado 100%)`);
        naturezas.forEach((n) => {
          if (!naturezasCache.has(n.naturezaId))
            erros.push(`Natureza ${n.naturezaId} não encontrada`);
        });

        return {
          linha: item.linha,
          tipoLinha: item.tipoLinha,
          resumo: String(p.descricao || classe?.descricao || "Despesa"),
          erros,
          payload: p,
        };
      }

      // despesaOperacional
      if (plano.tipo !== "OPERACIONAL_GND3" && plano.tipo !== "OPERACIONAL_GND4") {
        erros.push("Linha de despesa operacional não corresponde a este tipo de plano");
      }
      const omDestinoId = String(p.omDestinoId || p.omId || "");
      const omCompradoraId = String(p.omCompradoraId || p.omId || "");
      if (!omsCache.has(omDestinoId)) erros.push("OM não encontrada");
      else if (!participantesIds.has(omDestinoId))
        erros.push(`OM ${omsCache.get(omDestinoId)?.sigla} não participa da operação`);
      if (!omsCache.has(omCompradoraId))
        erros.push("OM compradora não encontrada");

      const naturezas = Array.isArray(p.naturezas) ? (p.naturezas as { naturezaId: string; valor: number }[]) : [];
      if (naturezas.length === 0) erros.push("Nenhuma Natureza de Despesa informada");
      const somaValores = naturezas.reduce((s, n) => s + Number(n.valor), 0);
      if (somaValores <= 0) erros.push("Soma dos valores das NDs é zero");
      naturezas.forEach((n) => {
        if (!naturezasCache.has(n.naturezaId))
          erros.push(`Natureza ${n.naturezaId} não encontrada`);
      });
      if (!p.titulo) erros.push("Título é obrigatório");
      if (!p.memoriaCalculo) erros.push("Memória de cálculo é obrigatória");

      return {
        linha: item.linha,
        tipoLinha: item.tipoLinha,
        resumo: String(p.titulo || "Despesa operacional"),
        erros,
        payload: p,
      };
    });

    if (!confirmar) {
      return NextResponse.json({
        preview: true,
        itens: itensValidados,
        errosLeitura,
      });
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

    const itensValidos = itensValidados.filter((i) => i.erros.length === 0);
    let criados = 0;

    for (const item of itensValidos) {
      const p = item.payload;
      if (item.tipoLinha === "despesa") {
        await prisma.despesa.create({
          data: {
            planoTrabalhoId: id,
            classeId: String(p.classeId),
            tipoId: p.tipoId ? String(p.tipoId) : null,
            descricao: String(p.descricao || ""),
            parametros: p.parametros as object,
            valorCalculado: Number(p.valorTotal),
            valorCombustivel: p.valorCombustivel
              ? Number(p.valorCombustivel)
              : null,
            oms: {
              create: (
                p.oms as {
                  omId?: string;
                  omDestinoId?: string;
                  omCompradoraId?: string;
                  percentual: number;
                }[]
              ).map((o) => {
                // Compatibilidade com xlsx exportados antes da separação
                // comprador/destino: usa omId legado como os dois campos.
                const omDestinoId = o.omDestinoId || o.omId!;
                const omCompradoraId = o.omCompradoraId || o.omId!;
                return { omDestinoId, omCompradoraId, percentual: o.percentual };
              }),
            },
            despesasNaturezas: {
              create: (
                p.naturezas as { naturezaId: string; percentual: number }[]
              ).map((n) => ({
                naturezaId: n.naturezaId,
                percentual: n.percentual,
              })),
            },
          },
        });
      } else {
        await prisma.despesaOperacional.create({
          data: {
            planoTrabalhoId: id,
            omDestinoId: String(p.omDestinoId || p.omId),
            omCompradoraId: String(p.omCompradoraId || p.omId),
            titulo: String(p.titulo),
            objeto: p.objeto ? String(p.objeto) : null,
            objetivo: p.objetivo ? String(p.objetivo) : null,
            finalidade: p.finalidade ? String(p.finalidade) : null,
            memoriaCalculo: String(p.memoriaCalculo),
            pregaoUasg: p.pregaoUasg ? String(p.pregaoUasg) : null,
            situacaoPregao: p.situacaoPregao
              ? (p.situacaoPregao as never)
              : null,
            observacaoPregao: p.observacaoPregao
              ? String(p.observacaoPregao)
              : null,
            naturezas: {
              create: (
                p.naturezas as { naturezaId: string; valor: number }[]
              ).map((n) => ({ naturezaId: n.naturezaId, valor: n.valor })),
            },
          },
        });
      }
      criados += 1;
    }

    if (plano.tipo === "LOGISTICO") {
      const total = await prisma.despesa.aggregate({
        where: { planoTrabalhoId: id },
        _sum: { valorCalculado: true },
      });
      await prisma.planoTrabalho.update({
        where: { id },
        data: { valorTotalDespesas: total._sum.valorCalculado || 0 },
      });
    } else {
      const total = await prisma.despesaOperacionalNatureza.aggregate({
        where: { despesaOperacional: { planoTrabalhoId: id } },
        _sum: { valor: true },
      });
      await prisma.planoTrabalho.update({
        where: { id },
        data: { valorTotalDespesas: total._sum.valor || 0 },
      });
    }

    await prisma.auditoriaLog.create({
      data: {
        tipoEvento: "CRIACAO",
        descricao: `Importação de ${criados} despesa(s) no plano "${plano.titulo}" via xlsx`,
        usuarioId: user.id,
        planoTrabalhoId: id,
        metadados: {
          criados,
          puladas: itensValidados.length - itensValidos.length,
        },
      },
    });

    return NextResponse.json({
      preview: false,
      criados,
      puladas: itensValidados.length - itensValidos.length,
      itens: itensValidados,
    });
  } catch (error) {
    console.error("Import despesas error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
