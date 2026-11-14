import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canCreatePlanoTrabalho } from "@/lib/permissions";
import { TipoPlano, StatusPlano, TipoEvento, Prisma } from "@prisma/client";
import {
  parsePTrabXlsx,
  parsePTrabPdf,
  type LinhaImportada,
} from "@/lib/importacao/parserPTrabModelo";

const TIPOS_SUPORTADOS: TipoPlano[] = [
  TipoPlano.LOGISTICO,
  TipoPlano.OPERACIONAL_GND3,
  TipoPlano.OPERACIONAL_GND4,
];

function acharOmPorTexto(
  omTexto: string,
  participantes: { omId: string; om: { sigla: string } }[]
): string | null {
  const texto = omTexto.trim().toUpperCase();
  if (!texto) return null;
  const match = participantes.find((p) =>
    texto.includes(p.om.sigla.toUpperCase())
  );
  return match ? match.omId : null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: operacaoId } = await params;
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: currentUser.userId },
    });
    if (!user || !canCreatePlanoTrabalho(user.role)) {
      return NextResponse.json(
        { error: "Sem permissão para importar plano de trabalho" },
        { status: 403 }
      );
    }

    const operacao = await prisma.operacao.findUnique({
      where: { id: operacaoId },
      include: { omsParticipantes: { include: { om: true } } },
    });
    if (!operacao) {
      return NextResponse.json(
        { error: "Operação não encontrada" },
        { status: 404 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const tipo = String(formData.get("tipo") || "");
    const omIdPadrao = String(formData.get("omId") || "");
    const origem = String(formData.get("origem") || "").trim();

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Arquivo não enviado" },
        { status: 400 }
      );
    }
    if (!origem) {
      return NextResponse.json(
        { error: "Informe a origem do documento" },
        { status: 400 }
      );
    }
    if (!TIPOS_SUPORTADOS.includes(tipo as TipoPlano)) {
      return NextResponse.json(
        { error: "Tipo de plano não suportado para importação" },
        { status: 400 }
      );
    }
    const omPadraoParticipa = operacao.omsParticipantes.some(
      (p) => p.omId === omIdPadrao
    );
    if (!omPadraoParticipa) {
      return NextResponse.json(
        { error: "A OM informada não participa desta operação" },
        { status: 400 }
      );
    }

    const nomeArquivo = file.name.toLowerCase();
    const buffer = Buffer.from(await file.arrayBuffer());

    let linhas: LinhaImportada[];
    let avisos: string[];
    if (nomeArquivo.endsWith(".xlsx")) {
      ({ linhas, avisos } = await parsePTrabXlsx(buffer));
    } else if (nomeArquivo.endsWith(".pdf")) {
      ({ linhas, avisos } = await parsePTrabPdf(buffer));
    } else {
      return NextResponse.json(
        { error: "Formato de arquivo não suportado. Envie .xlsx ou .pdf." },
        { status: 400 }
      );
    }

    if (linhas.length === 0) {
      return NextResponse.json(
        { error: "Nenhuma despesa reconhecida no arquivo", avisos },
        { status: 400 }
      );
    }

    // Um P Trab real costuma trazer, no mesmo arquivo, abas de Plano
    // Logístico (Classe I-X) e de Plano Operacional (GND3/GND4) lado a
    // lado — cada uma com colunas de ND diferentes. Só as linhas cujo
    // formato bate com o Tipo de Plano escolhido na importação entram;
    // as demais são ignoradas aqui para não misturar os dois modelos.
    const formatoEsperado: "LOGISTICO" | "OPERACIONAL" =
      tipo === TipoPlano.LOGISTICO ? "LOGISTICO" : "OPERACIONAL";
    const totalAntesDoFiltro = linhas.length;
    linhas = linhas.filter((l) => l.formatoPlano === formatoEsperado);
    const linhasFormatoIgnorado = totalAntesDoFiltro - linhas.length;

    if (linhas.length === 0) {
      return NextResponse.json(
        {
          error: `Nenhuma linha no formato de Plano ${
            formatoEsperado === "LOGISTICO" ? "Logístico" : "Operacional"
          } foi encontrada neste arquivo (${linhasFormatoIgnorado} linha(s) pertencem a outro tipo de Plano). Confira o Tipo do Plano selecionado.`,
          avisos,
        },
        { status: 400 }
      );
    }
    if (linhasFormatoIgnorado > 0) {
      avisos.push(
        `${linhasFormatoIgnorado} linha(s) do arquivo pertencem a outro tipo de Plano (Logístico × Operacional) e foram ignoradas nesta importação.`
      );
    }

    const naturezas = await prisma.naturezaDespesa.findMany();
    const naturezaIdPorCodigo = new Map(
      naturezas.map((n) => [n.codigo, n.id])
    );
    const gndPorCodigo = new Map(naturezas.map((n) => [n.codigo, n.gnd]));
    // Plano Operacional é sempre de um único GND — colunas de ND de GND
    // diferente presentes no arquivo (ex.: 44.90.52 num GND 3) são
    // ignoradas em vez de criar uma despesa com GND incompatível.
    const gndEsperadoOperacional =
      tipo === TipoPlano.OPERACIONAL_GND4 ? "GND 4" : "GND 3";

    const lastVersion = await prisma.planoTrabalho.findFirst({
      where: { operacaoId },
      orderBy: { versao: "desc" },
      select: { versao: true },
    });
    const nextVersion = lastVersion ? lastVersion.versao + 1 : 1;

    const dataFormatada = new Date().toLocaleDateString("pt-BR");
    const titulo = `P Trab Importado - ${origem} (${dataFormatada})`;

    const resultado = await prisma.$transaction(async (tx) => {
      const plano = await tx.planoTrabalho.create({
        data: {
          titulo,
          versao: nextVersion,
          operacaoId,
          omId: omIdPadrao,
          responsavelId: user.id,
          status: StatusPlano.RASCUNHO,
          tipo: tipo as TipoPlano,
          importado: true,
          origemImportacao: origem,
        },
      });

      let classeXId: string | null = null;
      // Classes por nome (ex.: "CLASSE_III"), com as NDs que cada uma aceita
      // — usadas para mapear a classe sugerida pelo parser (ver
      // inferirClasseDespesa) para o id real, com uma checagem de
      // segurança antes de aceitar a sugestão.
      const classesPorNome = new Map<
        string,
        { id: string; naturezasPermitidas: string[] }
      >();
      if (tipo === TipoPlano.LOGISTICO) {
        const todasClasses = await tx.classe.findMany();
        todasClasses.forEach((c) =>
          classesPorNome.set(c.nome, {
            id: c.id,
            naturezasPermitidas: c.naturezasPermitidas,
          })
        );
        classeXId = classesPorNome.get("CLASSE_X")?.id || null;
        if (!classeXId) {
          throw new Error(
            "CLASSE_X não encontrada — rode o seed antes de importar"
          );
        }
      }

      const avisosLinhas: string[] = [];

      for (const linha of linhas) {
        const omAlvo =
          acharOmPorTexto(linha.omTexto, operacao.omsParticipantes) ||
          omIdPadrao;

        const entradasNd = Object.entries(linha.valoresPorNd).filter(
          ([codigo]) =>
            naturezaIdPorCodigo.has(codigo) &&
            (tipo === TipoPlano.LOGISTICO ||
              gndPorCodigo.get(codigo) === gndEsperadoOperacional)
        );
        if (entradasNd.length === 0) {
          avisosLinhas.push(
            `"${linha.titulo.slice(0, 50)}": nenhuma natureza de despesa reconhecida, linha ignorada.`
          );
          continue;
        }
        const somaValores = entradasNd.reduce((s, [, v]) => s + v, 0);

        if (tipo === TipoPlano.LOGISTICO) {
          const percentuais = entradasNd.map(([, valor], idx) => {
            const pct =
              idx === entradasNd.length - 1
                ? 100 -
                  entradasNd
                    .slice(0, -1)
                    .reduce(
                      (s, [, v]) =>
                        s + Math.round((v / somaValores) * 10000) / 100,
                      0
                    )
                : Math.round((valor / somaValores) * 10000) / 100;
            return pct;
          });

          // A classe sugerida pelo parser só é usada se todas as NDs da
          // linha forem compatíveis com ela — senão cai para CLASSE_X, que
          // aceita qualquer ND, em vez de criar uma despesa inconsistente.
          const classeSugerida = classesPorNome.get(linha.classeSugerida);
          const sugestaoCompativel =
            classeSugerida &&
            entradasNd.every(([codigo]) =>
              classeSugerida.naturezasPermitidas.includes(codigo)
            );
          const classeEscolhidaId = sugestaoCompativel
            ? classeSugerida!.id
            : classeXId!;
          if (linha.classeSugerida !== "CLASSE_X" && !sugestaoCompativel) {
            avisosLinhas.push(
              `"${linha.titulo.slice(0, 50)}": parecia ser ${linha.classeSugerida.replace("CLASSE_", "Classe ")}, mas tem Natureza de Despesa incompatível — lançada em Classe X. Revise e corrija a classe manualmente.`
            );
          }

          await tx.despesa.create({
            data: {
              descricao: linha.detalhamento || linha.titulo,
              planoTrabalhoId: plano.id,
              classeId: classeEscolhidaId,
              parametros: {
                quantidade: 1,
                valorUnitario: somaValores,
                tituloImportado: linha.titulo,
              } as Prisma.InputJsonValue,
              valorCalculado: somaValores,
              importado: true,
              valorImportadoOriginal: somaValores,
              oms: {
                create: [
                  { omDestinoId: omAlvo, omCompradoraId: omAlvo, percentual: 100 },
                ],
              },
              despesasNaturezas: {
                create: entradasNd.map(([codigo], idx) => ({
                  naturezaId: naturezaIdPorCodigo.get(codigo)!,
                  percentual: percentuais[idx],
                })),
              },
            },
          });
        } else {
          await tx.despesaOperacional.create({
            data: {
              planoTrabalhoId: plano.id,
              omDestinoId: omAlvo,
              omCompradoraId: omAlvo,
              titulo: linha.titulo,
              memoriaCalculo: linha.detalhamento || linha.titulo,
              importado: true,
              naturezas: {
                create: entradasNd.map(([codigo, valor]) => ({
                  naturezaId: naturezaIdPorCodigo.get(codigo)!,
                  valor,
                })),
              },
            },
          });
        }
      }

      if (tipo === TipoPlano.LOGISTICO) {
        const total = await tx.despesa.aggregate({
          where: { planoTrabalhoId: plano.id },
          _sum: { valorCalculado: true },
        });
        await tx.planoTrabalho.update({
          where: { id: plano.id },
          data: { valorTotalDespesas: total._sum.valorCalculado || 0 },
        });
      } else {
        const total = await tx.despesaOperacionalNatureza.aggregate({
          where: { despesaOperacional: { planoTrabalhoId: plano.id } },
          _sum: { valor: true },
        });
        await tx.planoTrabalho.update({
          where: { id: plano.id },
          data: { valorTotalDespesas: total._sum.valor || 0 },
        });
      }

      await tx.auditoriaLog.create({
        data: {
          tipoEvento: TipoEvento.CRIACAO,
          descricao: `Plano de Trabalho "${plano.titulo}" importado de "${origem}"`,
          usuarioId: user.id,
          planoTrabalhoId: plano.id,
          operacaoId,
          metadados: { linhasImportadas: linhas.length, origem },
        },
      });

      return { planoId: plano.id, avisosLinhas };
    });

    return NextResponse.json({
      planoId: resultado.planoId,
      linhasImportadas: linhas.length,
      avisos: [...avisos, ...resultado.avisosLinhas],
    });
  } catch (error) {
    console.error("Erro ao importar P Trab:", error);
    return NextResponse.json(
      { error: "Erro interno ao importar plano de trabalho" },
      { status: 500 }
    );
  }
}
