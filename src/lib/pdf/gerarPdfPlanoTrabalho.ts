import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { DespesaWithRelations } from "@/types/despesas";
import { Prisma, User } from "@prisma/client";
import { getClasseNome, getClasseOrdem } from "@/lib/classes";
import {
  BRASAO_PATH,
  carregarImagemBase64,
  formatarMoeda,
  formatarNumero,
  formatarDataExtenso,
  formatarDataCurta,
  prepararTextoParaTabela,
} from "@/lib/pdf/formatadores";
import { agruparConsolidado } from "@/lib/consolidado/construirConsolidado";

// Tipos
export type PlanoComRelacoes = Prisma.PlanoTrabalhoGetPayload<{
  include: {
    om: true;
    operacao: true;
    responsavel: true;
    despesas: {
      include: {
        classe: true;
        tipo: true;
        oms: { include: { omDestino: true; omCompradora: true } };
        despesasNaturezas: { include: { natureza: true } };
      };
    };
  };
}>;

export type OperacaoComOM = Prisma.OperacaoGetPayload<{
  include: {
    om: true;
    user: true;
  };
}>;

export interface DespesaParaPdf {
  descricao: string;
  classe: string;
  classeOrdem: number;
  tipo: string | null;
  /** OM destino (carimbo do P Trab) — mantidos por compatibilidade com o
   *  agrupamento atual dos documentos de Plano de Trabalho. */
  omNome: string;
  codUG: string;
  omNomeDestino: string;
  codUGDestino: string;
  /** OM compradora (CODUG do empenho) — usada no agrupamento da DOR. */
  omNomeCompradora: string;
  codUGCompradora: string;
  /** OM titular do Plano de Trabalho — usada no agrupamento do "OM RESPONSÁVEL". */
  omNomeOwner: string;
  codUGOwner: string;
  valor30: number;
  valor39: number;
  gnd3: number;
  litros: number | null;
  precoUnitario: number | null;
  precoTotalCombustivel: number | null;
  memoriaCalculo: string;
}

export interface GrupoDespesas {
  omPrincipal: string;
  codUGPrincipal: string;
  despesas: DespesaParaPdf[];
  subtotal30: number;
  subtotal39: number;
  subtotalGnd3: number;
}

function extrairMemoriaCalculo(parametros: unknown): string {
  if (!parametros || typeof parametros !== "object") return "";
  const params = parametros as Record<string, unknown>;
  if (params.carimbo && typeof params.carimbo === "string") {
    return params.carimbo;
  }
  return "";
}

export function processarDespesas(
  despesas: DespesaWithRelations[],
  omOwner?: { nome: string; codUG: string | null }
): DespesaParaPdf[] {
  // Cada despesa gera uma linha POR OM do rateio, com os valores
  // distribuídos pelo percentual de cada OM (DespesaOM.percentual).
  return despesas.flatMap((despesa) => {
    const valorTotal = Number(despesa.valorCalculado);
    const valorCombustivelDespesa = despesa.valorCombustivel
      ? Number(despesa.valorCombustivel)
      : null;

    // Calcular valores por natureza de despesa (sobre o total da despesa)
    let valor30Total = 0;
    let valor39Total = 0;

    despesa.despesasNaturezas.forEach((dn) => {
      const percentual = Number(dn.percentual);
      const valorND = valorTotal * (percentual / 100);
      if (dn.natureza.codigo === "33.90.30") {
        valor30Total = valorND;
      } else if (dn.natureza.codigo === "33.90.39") {
        valor39Total = valorND;
      }
    });

    // Se não tem naturezas específicas, assume tudo em 33.90.30
    if (despesa.despesasNaturezas.length === 0) {
      valor30Total = valorTotal;
    }

    // Verificar se é despesa de combustível (Classe III)
    const isCombustivel =
      despesa.tipo?.isCombustivel || despesa.classe.nome === "CLASSE_III";

    // valorCombustivel no banco = litros; valorCalculado = valor total em R$
    const litrosTotal =
      isCombustivel && valorCombustivelDespesa && valorCombustivelDespesa > 0
        ? valorCombustivelDespesa
        : null;
    const precoUnitario =
      litrosTotal !== null ? valorTotal / litrosTotal : null;

    // Ordem militar da classe (I-X), calculada a partir do enum cru
    const classeOrdem = getClasseOrdem(despesa.classe.nome);

    // Nome da classe formatado
    const classeNome = getClasseNome(despesa.classe.nome);
    const tipoNome = despesa.tipo?.nome || "";

    // Título da despesa (primeira coluna): Classe + Tipo
    const tituloDespesa = tipoNome ? `${classeNome} - ${tipoNome}` : classeNome;

    // Memória de cálculo (última coluna): usar descrição da despesa
    const memoriaCalculo =
      despesa.descricao || extrairMemoriaCalculo(despesa.parametros);

    // Rateios da despesa; sem rateio cadastrado, lança 100% sem OM
    const rateios =
      despesa.oms.length > 0
        ? despesa.oms.map((r) => ({
            omDestino: r.omDestino,
            omCompradora: r.omCompradora,
            fracao: Number(r.percentual) / 100,
            percentual: Number(r.percentual),
          }))
        : [{ omDestino: null, omCompradora: null, fracao: 1, percentual: 100 }];

    return rateios.map(({ omDestino, omCompradora, fracao, percentual }) => ({
      descricao: tituloDespesa,
      classe: classeNome,
      classeOrdem,
      tipo: tipoNome,
      omNome: omDestino ? `${omDestino.sigla}` : "",
      codUG: omDestino?.codUG || "",
      omNomeDestino: omDestino ? `${omDestino.sigla}` : "",
      codUGDestino: omDestino?.codUG || "",
      omNomeCompradora: omCompradora ? `${omCompradora.sigla}` : "",
      codUGCompradora: omCompradora?.codUG || "",
      omNomeOwner: omOwner?.nome || (omDestino ? `${omDestino.sigla}` : ""),
      codUGOwner: omOwner?.codUG || omDestino?.codUG || "",
      valor30: valor30Total * fracao,
      valor39: valor39Total * fracao,
      gnd3: (valor30Total + valor39Total) * fracao,
      litros: litrosTotal !== null ? litrosTotal * fracao : null,
      precoUnitario,
      precoTotalCombustivel:
        litrosTotal !== null ? valorTotal * fracao : null,
      memoriaCalculo: prepararTextoParaTabela(
        rateios.length > 1
          ? `${memoriaCalculo}\nRateio desta OM: ${percentual.toFixed(2)}% do total da despesa.`
          : memoriaCalculo
      ),
    }));
  });
}

export function agruparDespesasPorOM(
  despesas: DespesaParaPdf[]
): GrupoDespesas[] {
  const grupos: Map<string, GrupoDespesas> = new Map();

  despesas.forEach((despesa) => {
    const chave = despesa.codUG || "SEM_OM";

    if (!grupos.has(chave)) {
      grupos.set(chave, {
        omPrincipal: despesa.omNome,
        codUGPrincipal: despesa.codUG,
        despesas: [],
        subtotal30: 0,
        subtotal39: 0,
        subtotalGnd3: 0,
      });
    }

    const grupo = grupos.get(chave)!;
    grupo.despesas.push(despesa);
    grupo.subtotal30 += despesa.valor30;
    grupo.subtotal39 += despesa.valor39;
    grupo.subtotalGnd3 += despesa.gnd3;
  });

  return Array.from(grupos.values());
}

export interface OpcoesPdf {
  acoesRealizadas?: string;
  despesasOperacionais?: string;
  omPrincipal?: string;
  /** Sobrescreve o nome exibido na assinatura (padrão: responsável do plano) */
  nomeAssinante?: string;
  /** Sobrescreve o posto/graduação exibido na assinatura */
  postoAssinante?: string;
  /** Sobrescreve a legenda sob a assinatura (padrão: "Responsável pelo Plano de Trabalho") */
  funcaoAssinante?: string;
}

const TABLE_HEAD = [
  [
    "DESPESAS (ORDENAR POR CLASSE DE SUBSISTÊNCIA)",
    "OM (UGE)\nCODUG",
    "33.90.30",
    "33.90.39",
    "GND 3",
    "LITROS",
    "PREÇO\nUNITÁRIO",
    "PREÇO\nTOTAL",
    "DETALHAMENTO / MEMÓRIA DE CÁLCULO",
  ],
];

const COLUMN_STYLES = {
  // Total: 28+18+15+15+15+14+16+16+140 = 277mm (A4 landscape - 20mm margins)
  0: { cellWidth: 28, overflow: "linebreak" as const }, // DESPESAS
  1: { cellWidth: 18, halign: "center" as const, overflow: "linebreak" as const }, // OM (UGE) CODUG
  2: { cellWidth: 15, halign: "right" as const }, // 33.90.30
  3: { cellWidth: 15, halign: "right" as const }, // 33.90.39
  4: { cellWidth: 15, halign: "right" as const }, // GND 3
  5: { cellWidth: 14, halign: "right" as const }, // LITROS
  6: { cellWidth: 16, halign: "right" as const }, // PREÇO UNIT
  7: { cellWidth: 16, halign: "right" as const }, // PREÇO TOTAL
  8: { cellWidth: 140, overflow: "linebreak" as const }, // DETALHAMENTO
};

function linhaDespesa(despesa: DespesaParaPdf): (string | number)[] {
  return [
    despesa.descricao,
    `${despesa.omNome}\n(${despesa.codUG})`,
    formatarNumero(despesa.valor30),
    formatarNumero(despesa.valor39),
    formatarNumero(despesa.gnd3),
    despesa.litros ? formatarNumero(despesa.litros) : "-",
    despesa.precoUnitario ? `R$ ${formatarNumero(despesa.precoUnitario)}` : "-",
    despesa.precoTotalCombustivel
      ? `R$ ${formatarNumero(despesa.precoTotalCombustivel)}`
      : "-",
    despesa.memoriaCalculo,
  ];
}

export async function gerarPdfPlanoTrabalho(
  planos: PlanoComRelacoes | PlanoComRelacoes[],
  operacao: OperacaoComOM,
  responsavel?: User,
  opcoes?: OpcoesPdf,
  omsIncluidas?: string[],
  /** Quando informado, desenha neste documento (numa página nova) em vez
   *  de criar/salvar um PDF separado — usado para juntar Logístico,
   *  Operacional, Ração e Munição num único arquivo (ex.: "Assinar no
   *  gov.br", onde vários downloads automáticos seguidos são bloqueados
   *  pelo navegador). */
  docExistente?: jsPDF
): Promise<jsPDF> {
  planos = ([] as PlanoComRelacoes[]).concat(planos);
  const doc =
    docExistente ??
    new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });
  if (docExistente) {
    doc.addPage("a4", "landscape");
  }

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = 10;
  const marginRight = 10;
  const marginTop = 10;
  let currentY = marginTop;

  // === CABEÇALHO COM BRASÃO ===
  try {
    const brasaoBase64 = await carregarImagemBase64(BRASAO_PATH);
    if (brasaoBase64) {
      doc.addImage(brasaoBase64, "PNG", pageWidth / 2 - 25, currentY, 50, 24);
      currentY += 30;
    } else {
      // Fallback: mostrar texto se imagem não encontrada
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.text("[Brasão da República]", pageWidth / 2, currentY + 10, {
        align: "center",
      });
      currentY += 20;
    }
  } catch {
    currentY += 5;
  }

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("MINISTÉRIO DA DEFESA", pageWidth / 2, currentY, {
    align: "center",
  });
  currentY += 5;
  doc.text("EXÉRCITO BRASILEIRO", pageWidth / 2, currentY, { align: "center" });
  currentY += 5;

  // Sem override explícito, usa a OM dona da Operação como cabeçalho —
  // nunca um nome de OM fixo no código (bug anterior: hardcoded "COMANDO
  // MILITAR DA AMAZÔNIA", errado para qualquer Operação de outro Comando).
  const omPrincipal =
    opcoes?.omPrincipal?.toUpperCase() ??
    (planos.length > 1
      ? operacao.om.nome.toUpperCase()
      : planos[0].om.nome.toUpperCase());

  doc.text(omPrincipal, pageWidth / 2, currentY, {
    align: "center",
  });
  currentY += 6;
  doc.setFontSize(9);
  doc.text(
    `PLANO DE TRABALHO LOGÍSTICO DE SOLICITAÇÃO DE RECURSOS ORÇAMENTÁRIOS E FINANCEIROS PARA ${operacao.nome.toUpperCase()}`,
    pageWidth / 2,
    currentY,
    { align: "center", maxWidth: pageWidth - 40 }
  );
  currentY += 10;

  // === TÍTULO ===
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("PLANO DE TRABALHO LOGÍSTICO", pageWidth / 2, currentY, {
    align: "center",
  });
  currentY += 8;

  // === DADOS DA OPERAÇÃO ===
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");

  const dataInicio = new Date(operacao.dataInicio);
  const dataFinal = new Date(operacao.dataFinal);
  const periodo = `${formatarDataCurta(dataInicio)} A ${formatarDataCurta(
    dataFinal
  )}`;
  const efetivoMil = operacao.efetivoMil;
  const efetivoExt = operacao.efetivoExt || 0;
  const efetivo =
    efetivoExt > 0
      ? `${efetivoMil} militares do EB + ${efetivoExt} agentes externos`
      : `${efetivoMil} militares do EB`;

  doc.text(`1. NOME DA OPERAÇÃO: `, marginLeft, currentY);
  doc.setFont("helvetica", "normal");
  doc.text(
    operacao.nome.toUpperCase(),
    marginLeft + doc.getTextWidth("1. NOME DA OPERAÇÃO: "),
    currentY
  );
  currentY += 5;

  doc.setFont("helvetica", "bold");
  doc.text(`2. PERÍODO: `, marginLeft, currentY);
  doc.setFont("helvetica", "normal");
  doc.text(
    `${periodo}`,
    marginLeft + doc.getTextWidth("2. PERÍODO: "),
    currentY
  );
  currentY += 5;

  doc.setFont("helvetica", "bold");
  doc.text(`3. EFETIVO EMPREGADO: `, marginLeft, currentY);
  doc.setFont("helvetica", "normal");
  doc.text(
    efetivo,
    marginLeft + doc.getTextWidth("3. EFETIVO EMPREGADO: "),
    currentY
  );
  currentY += 5;

  // Usar valores das opções se fornecidos, senão usar valores da operação
  const acoesRealizadas = opcoes?.acoesRealizadas || operacao.finalidade;
  const despesasOperacionais =
    opcoes?.despesasOperacionais || operacao.motivacao;

  if (acoesRealizadas) {
    doc.setFont("helvetica", "bold");
    doc.text(`4. AÇÕES REALIZADAS OU A REALIZAR: `, marginLeft, currentY);
    doc.setFont("helvetica", "normal");
    const acoesLines = doc.splitTextToSize(
      acoesRealizadas,
      pageWidth - marginLeft - marginRight - 60
    );
    doc.text(
      acoesLines,
      marginLeft + doc.getTextWidth("4. AÇÕES REALIZADAS OU A REALIZAR: ") + 2,
      currentY
    );
    currentY += acoesLines.length * 4 + 2;
  }

  if (despesasOperacionais) {
    doc.setFont("helvetica", "bold");
    doc.text(
      `5. DESPESAS OPERACIONAIS REALIZADAS OU A REALIZAR: `,
      marginLeft,
      currentY
    );
    doc.setFont("helvetica", "normal");
    const despesasLines = doc.splitTextToSize(
      despesasOperacionais,
      pageWidth - marginLeft - marginRight - 80
    );
    doc.text(
      despesasLines,
      marginLeft +
        doc.getTextWidth(
          "5. DESPESAS OPERACIONAIS REALIZADAS OU A REALIZAR: "
        ) +
        2,
      currentY
    );
    currentY += despesasLines.length * 4 + 2;
  }

  currentY += 5;

  // Achata as despesas de TODOS os planos recebidos uma única vez; o
  // agrupamento por OM (chave = OM TITULAR do Plano, não o destino do
  // rateio) acontece sobre essa lista combinada, então uma OM com dois
  // Planos de Trabalho na mesma Operação cai num único grupo em vez de
  // aparecer duas vezes. A OM titular ("OM RESPONSÁVEL") não muda mesmo
  // que a despesa seja rateada para outra OM destino/compradora.
  const todasDespesasBrutas = planos.flatMap((plano) =>
    processarDespesas(plano.despesas as unknown as DespesaWithRelations[], {
      nome: plano.om.nome,
      codUG: plano.om.codUG,
    })
  );
  const { porOM: gruposPorOM } = agruparConsolidado(todasDespesasBrutas, {
    chaveAgrupamento: "owner",
    omsIncluidas,
  });

  // === UMA TABELA POR OM (mesclando despesas de todos os Planos daquela
  // OM) + UM TOTAL GERAL ao final, somando todas as OMs ===
  let valorTotalGeralOperacao = 0;

  gruposPorOM.forEach((grupo) => {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(
      `OM RESPONSÁVEL: ${grupo.omNome.toUpperCase()}`,
      marginLeft,
      currentY
    );
    currentY += 8;

    // Dentro da seção da OM responsável, as despesas ainda são quebradas
    // por OM DESTINO (uma tabela + subtotal por destino) — o rateio interno
    // para outra OM não muda quem é o responsável pelo Ptrab, mas o valor
    // de cada destino continua sendo rastreado separadamente.
    const { porOM: subGruposDestino } = agruparConsolidado(grupo.linhas, {
      chaveAgrupamento: "destino",
    });

    let subtotalGnd3Responsavel = 0;

    subGruposDestino.forEach((subGrupo) => {
      const tableBody: (string | number)[][] = subGrupo.linhas.map(linhaDespesa);

      let subtotal30 = 0;
      let subtotal39 = 0;
      let subtotalGnd3 = 0;
      subGrupo.linhas.forEach((d) => {
        subtotal30 += d.valor30;
        subtotal39 += d.valor39;
        subtotalGnd3 += d.gnd3;
      });

      // Linha de subtotal
      tableBody.push([
        "SOMA POR ND E GP DE DESPESA",
        "",
        formatarNumero(subtotal30),
        formatarNumero(subtotal39),
        formatarNumero(subtotalGnd3),
        "",
        "",
        "",
        "",
      ]);

      subtotalGnd3Responsavel += subtotalGnd3;

      autoTable(doc, {
        head: TABLE_HEAD,
        body: tableBody,
        startY: currentY,
        theme: "grid",
        styles: {
          fontSize: 6,
          cellPadding: 1,
          overflow: "linebreak",
          lineWidth: 0.1,
        },
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontStyle: "bold",
          halign: "center",
          valign: "middle",
          lineWidth: 0.2,
        },
        columnStyles: COLUMN_STYLES,
        didParseCell: function (data) {
          // Estilizar linha de subtotal
          if (
            data.row.index === tableBody.length - 1 &&
            data.section === "body"
          ) {
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.fillColor = [240, 240, 240];
          }
        },
        margin: { left: marginLeft, right: marginRight },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      currentY = (doc as any).lastAutoTable.finalY + 5;

      // Verificar se precisa de nova página
      if (currentY > pageHeight - 40) {
        doc.addPage();
        currentY = marginTop;
      }

      // === VALOR TOTAL (do destino, dentro da seção da OM responsável) ===
      if (subGruposDestino.length > 1) {
        currentY += 2;
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text(
          `Valor destinado à ${subGrupo.omNome}: ${formatarMoeda(subtotalGnd3)}`,
          pageWidth / 2,
          currentY,
          { align: "center" }
        );
        currentY += 8;
      }
    });

    valorTotalGeralOperacao += subtotalGnd3Responsavel;

    // === VALOR TOTAL (da OM responsável) ===
    currentY += 5;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(
      `VALOR TOTAL (${grupo.omNome}): ${formatarMoeda(subtotalGnd3Responsavel)}`,
      pageWidth / 2,
      currentY,
      { align: "center" }
    );
    currentY += 15;
  });

  // === TOTAL GERAL (todas as OMs) ===
  if (gruposPorOM.length > 1) {
    if (currentY > pageHeight - 30) {
      doc.addPage();
      currentY = marginTop;
    }
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(
      `VALOR TOTAL GERAL: ${formatarMoeda(valorTotalGeralOperacao)}`,
      pageWidth / 2,
      currentY,
      { align: "center" }
    );
    currentY += 15;
  }

  // === RODAPÉ - ASSINATURA ===
  const hoje = new Date();
  const cidade = "MANAUS - AM"; // Pode ser obtido da OM
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(
    `${cidade}, ${formatarDataExtenso(hoje)}.`,
    pageWidth / 2,
    currentY,
    {
      align: "center",
    }
  );
  currentY += 15;

  // Nome e cargo de quem assina — texto livre informado no momento da
  // exportação tem prioridade sobre o responsável do plano (ex.: fluxo de
  // "Assinar no gov.br", onde a autoridade que assina pode não ser quem
  // preencheu o plano).
  const assinanteNome = opcoes?.nomeAssinante;
  const assinantePosto = opcoes?.postoAssinante;
  const assinanteFuncao = opcoes?.funcaoAssinante;

  if (assinanteNome || responsavel) {
    doc.setFont("helvetica", "bold");
    doc.text(
      assinanteNome
        ? `${assinantePosto ? assinantePosto + " " : ""}${assinanteNome.toUpperCase()}`
        : `${responsavel!.postoGraduacao} ${responsavel!.nomeCompleto.toUpperCase()}`,
      pageWidth / 2,
      currentY,
      { align: "center" }
    );
    currentY += 5;
    doc.setFont("helvetica", "normal");
    doc.text(
      assinanteFuncao || "Responsável pelo Plano de Trabalho",
      pageWidth / 2,
      currentY,
      { align: "center" }
    );
  }

  // Salvar o PDF — nome do arquivo inclui a(s) OM(s) para não colidir
  // quando se baixa o PDF de mais de uma OM da mesma Operação.
  if (!docExistente) {
    const siglaArquivo =
      planos.length > 1
        ? "Consolidado"
        : planos[0].om.sigla.replace(/\s+/g, "_");
    doc.save(
      `plano_trabalho_${siglaArquivo}_${operacao.nome.replace(/\s+/g, "_")}.pdf`
    );
  }
  return doc;
}
