import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Prisma, User } from "@prisma/client";
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

// Ordem das colunas de ND seguida pelo modelo de referência (Plano de
// Trabalho Operacional GND3/GND4). Novas NDs cadastradas fora desta lista
// ainda entram no total geral, mas não ganham coluna própria.
export const COLUNAS_ND = [
  "33.90.15",
  "33.90.30",
  "33.90.33",
  "33.90.39",
  "33.90.40",
  "44.90.52",
] as const;

export type PlanoComRelacoes = Prisma.PlanoTrabalhoGetPayload<{
  include: {
    om: true;
    operacao: true;
    responsavel: true;
    despesasOperacionais: {
      include: {
        omDestino: true;
        omCompradora: true;
        naturezas: { include: { natureza: true } };
      };
    };
  };
}>;

export type OperacaoComOM = Prisma.OperacaoGetPayload<{
  include: {
    om: true;
  };
}>;

export interface DespesaOperacionalParaPdf {
  titulo: string;
  omNome: string;
  codUG: string;
  omNomeDestino: string;
  codUGDestino: string;
  omNomeCompradora: string;
  codUGCompradora: string;
  /** OM titular do Plano de Trabalho — usada no agrupamento do "OM RESPONSÁVEL". */
  omNomeOwner: string;
  codUGOwner: string;
  valoresPorNd: Record<string, number>;
  gnd3: number;
  gnd4: number;
  detalhamento: string;
}

export interface GrupoDespesasOperacionais {
  omPrincipal: string;
  codUGPrincipal: string;
  despesas: DespesaOperacionalParaPdf[];
  subtotaisPorNd: Record<string, number>;
  subtotalGnd3: number;
  subtotalGnd4: number;
}

export function situacaoLabel(situacao: string | null): string | null {
  const labels: Record<string, string> = {
    PARTICIPANTE: "Participante do Pregão",
    ADESAO_CARONA: "Adesão / Carona",
    DISPENSA: "Dispensa de Licitação",
    INEXIGIBILIDADE: "Inexigibilidade",
    OUTRO: "Outro",
  };
  return situacao ? labels[situacao] || situacao : null;
}

export function processarDespesasOperacionais(
  despesas: PlanoComRelacoes["despesasOperacionais"],
  omOwner?: { nome: string; codUG: string | null }
): DespesaOperacionalParaPdf[] {
  return despesas.map((despesa) => {
    const valoresPorNd: Record<string, number> = {};
    let gnd3 = 0;
    let gnd4 = 0;

    despesa.naturezas.forEach((n) => {
      const valor = Number(n.valor);
      valoresPorNd[n.natureza.codigo] =
        (valoresPorNd[n.natureza.codigo] || 0) + valor;
      if (n.natureza.gnd === "GND 4") {
        gnd4 += valor;
      } else {
        gnd3 += valor;
      }
    });

    const partes: string[] = [];
    if (despesa.objeto) partes.push(`Objeto: ${despesa.objeto}`);
    if (despesa.objetivo) partes.push(`Objetivo: ${despesa.objetivo}`);
    if (despesa.finalidade) partes.push(`Finalidade: ${despesa.finalidade}`);
    partes.push(despesa.memoriaCalculo);

    const situacao = situacaoLabel(despesa.situacaoPregao);
    if (despesa.pregaoUasg || situacao) {
      const pregaoLinha = [despesa.pregaoUasg, situacao]
        .filter(Boolean)
        .join(" — ");
      partes.push(
        despesa.observacaoPregao
          ? `${pregaoLinha} (${despesa.observacaoPregao})`
          : pregaoLinha
      );
    }

    return {
      titulo: despesa.titulo,
      omNome: despesa.omDestino.sigla,
      codUG: despesa.omDestino.codUG || "",
      omNomeDestino: despesa.omDestino.sigla,
      codUGDestino: despesa.omDestino.codUG || "",
      omNomeCompradora: despesa.omCompradora.sigla,
      codUGCompradora: despesa.omCompradora.codUG || "",
      omNomeOwner: omOwner?.nome || despesa.omDestino.sigla,
      codUGOwner: omOwner?.codUG || despesa.omDestino.codUG || "",
      valoresPorNd,
      gnd3,
      gnd4,
      detalhamento: prepararTextoParaTabela(partes.join("\n")),
    };
  });
}

export function agruparPorOM(
  despesas: DespesaOperacionalParaPdf[]
): GrupoDespesasOperacionais[] {
  const grupos: Map<string, GrupoDespesasOperacionais> = new Map();

  despesas.forEach((despesa) => {
    const chave = despesa.codUG || despesa.omNome || "SEM_OM";

    if (!grupos.has(chave)) {
      grupos.set(chave, {
        omPrincipal: despesa.omNome,
        codUGPrincipal: despesa.codUG,
        despesas: [],
        subtotaisPorNd: {},
        subtotalGnd3: 0,
        subtotalGnd4: 0,
      });
    }

    const grupo = grupos.get(chave)!;
    grupo.despesas.push(despesa);
    COLUNAS_ND.forEach((codigo) => {
      grupo.subtotaisPorNd[codigo] =
        (grupo.subtotaisPorNd[codigo] || 0) +
        (despesa.valoresPorNd[codigo] || 0);
    });
    grupo.subtotalGnd3 += despesa.gnd3;
    grupo.subtotalGnd4 += despesa.gnd4;
  });

  return Array.from(grupos.values());
}

export interface OpcoesPdfOperacional {
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

export async function gerarPdfPlanoTrabalhoOperacional(
  planos: PlanoComRelacoes | PlanoComRelacoes[],
  operacao: OperacaoComOM,
  responsavel?: User,
  opcoes?: OpcoesPdfOperacional,
  omsIncluidas?: string[],
  /** Ver comentário equivalente em gerarPdfPlanoTrabalho. */
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
  // nunca um nome de OM fixo no código.
  const omPrincipal =
    opcoes?.omPrincipal?.toUpperCase() ??
    (planos.length > 1
      ? operacao.om.nome.toUpperCase()
      : planos[0].om.nome.toUpperCase());

  doc.text(omPrincipal, pageWidth / 2, currentY, { align: "center" });
  currentY += 6;
  doc.setFontSize(9);
  doc.text(
    `PLANO DE TRABALHO LOGÍSTICO DE SOLICITAÇÃO DE RECURSOS ORÇAMENTÁRIOS E FINANCEIROS PARA ${operacao.nome.toUpperCase()}`,
    pageWidth / 2,
    currentY,
    { align: "center", maxWidth: pageWidth - 40 }
  );
  currentY += 10;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("PLANO DE TRABALHO OPERACIONAL - GND 3/GND 4", pageWidth / 2, currentY, {
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

  const acoesRealizadas = opcoes?.acoesRealizadas || operacao.finalidade;
  const despesasOperacionaisTexto =
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

  if (despesasOperacionaisTexto) {
    doc.setFont("helvetica", "bold");
    doc.text(
      `5. DESPESAS OPERACIONAIS REALIZADAS OU A REALIZAR: `,
      marginLeft,
      currentY
    );
    doc.setFont("helvetica", "normal");
    const despesasLines = doc.splitTextToSize(
      despesasOperacionaisTexto,
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

  const colunaLargura = 15;
  const colunaDetalhamento = 277 - 28 - 18 - colunaLargura * (COLUNAS_ND.length + 2);

  const tableHead = [
    [
      "DESPESAS",
      "OM (UGE)\nCODUG",
      ...COLUNAS_ND,
      "GND 3",
      "GND 4",
      "DETALHAMENTO / MEMÓRIA DE CÁLCULO",
    ],
  ];

  const columnStyles: Record<number, Record<string, unknown>> = {
    0: { cellWidth: 28, overflow: "linebreak" },
    1: { cellWidth: 18, halign: "center", overflow: "linebreak" },
  };
  COLUNAS_ND.forEach((_, idx) => {
    columnStyles[2 + idx] = { cellWidth: colunaLargura, halign: "right" };
  });
  columnStyles[2 + COLUNAS_ND.length] = {
    cellWidth: colunaLargura,
    halign: "right",
  };
  columnStyles[3 + COLUNAS_ND.length] = {
    cellWidth: colunaLargura,
    halign: "right",
  };
  columnStyles[4 + COLUNAS_ND.length] = {
    cellWidth: colunaDetalhamento,
    overflow: "linebreak",
  };

  function linhaDespesa(despesa: DespesaOperacionalParaPdf): (string | number)[] {
    return [
      despesa.titulo,
      `${despesa.omNome}\n(${despesa.codUG})`,
      ...COLUNAS_ND.map((codigo) =>
        despesa.valoresPorNd[codigo]
          ? formatarNumero(despesa.valoresPorNd[codigo])
          : "-"
      ),
      formatarNumero(despesa.gnd3),
      despesa.gnd4 ? formatarNumero(despesa.gnd4) : "-",
      despesa.detalhamento,
    ];
  }

  function renderTabela(
    tableBody: (string | number)[][],
    startY: number
  ): number {
    autoTable(doc, {
      head: tableHead,
      body: tableBody,
      startY,
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
      columnStyles,
      didParseCell: function (data) {
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
    return (doc as any).lastAutoTable.finalY + 5;
  }

  // Achata as despesas de TODOS os planos recebidos uma única vez; o
  // agrupamento por OM (chave = OM TITULAR do Plano, não o destino do
  // rateio) acontece sobre essa lista combinada, então uma OM com dois
  // Planos de Trabalho na mesma Operação cai num único grupo em vez de
  // aparecer duas vezes.
  const todasDespesasBrutas = planos.flatMap((plano) =>
    processarDespesasOperacionais(plano.despesasOperacionais, {
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

    const tableBody: (string | number)[][] = grupo.linhas.map(linhaDespesa);

    let subtotalGnd3 = 0;
    let subtotalGnd4 = 0;
    const subtotaisPorNd: Record<string, number> = {};
    grupo.linhas.forEach((d) => {
      subtotalGnd3 += d.gnd3;
      subtotalGnd4 += d.gnd4;
      COLUNAS_ND.forEach((codigo) => {
        subtotaisPorNd[codigo] =
          (subtotaisPorNd[codigo] || 0) + (d.valoresPorNd[codigo] || 0);
      });
    });

    tableBody.push([
      "SOMA POR ND E GP DE DESPESA",
      "",
      ...COLUNAS_ND.map((codigo) =>
        formatarNumero(subtotaisPorNd[codigo] || 0)
      ),
      formatarNumero(subtotalGnd3),
      subtotalGnd4 ? formatarNumero(subtotalGnd4) : "-",
      "",
    ]);

    valorTotalGeralOperacao += subtotalGnd3 + subtotalGnd4;

    currentY = renderTabela(tableBody, currentY);

    if (currentY > pageHeight - 40) {
      doc.addPage();
      currentY = marginTop;
    }

    currentY += 5;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(
      `VALOR TOTAL (${grupo.omNome}): ${formatarMoeda(subtotalGnd3 + subtotalGnd4)}`,
      pageWidth / 2,
      currentY,
      { align: "center" }
    );
    currentY += 15;
  });

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
  const cidade = "MANAUS - AM";
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(
    `${cidade}, ${formatarDataExtenso(hoje)}.`,
    pageWidth / 2,
    currentY,
    { align: "center" }
  );
  currentY += 15;

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

  if (!docExistente) {
    // Nome do arquivo inclui a(s) OM(s) para não colidir quando se baixa o
    // PDF de mais de uma OM da mesma Operação.
    const siglaArquivo =
      planos.length > 1
        ? "Consolidado"
        : planos[0].om.sigla.replace(/\s+/g, "_");
    doc.save(
      `plano_trabalho_operacional_${siglaArquivo}_${operacao.nome.replace(/\s+/g, "_")}.pdf`
    );
  }
  return doc;
}
