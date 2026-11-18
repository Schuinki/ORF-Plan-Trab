import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Prisma, User } from "@prisma/client";
import {
  BRASAO_PATH,
  carregarImagemBase64,
  formatarDataExtenso,
  formatarDataCurta,
  prepararTextoParaTabela,
} from "@/lib/pdf/formatadores";

export type PlanoRacaoComRelacoes = Prisma.PlanoTrabalhoGetPayload<{
  include: {
    om: true;
    operacao: true;
    responsavel: true;
    itensRacaoR2: { include: { om: true } };
  };
}>;

export type PlanoMunicaoComRelacoes = Prisma.PlanoTrabalhoGetPayload<{
  include: {
    om: true;
    operacao: true;
    responsavel: true;
    itensMunicao: { include: { om: true } };
  };
}>;

export type OperacaoComOM = Prisma.OperacaoGetPayload<{
  include: { om: true };
}>;

export interface OpcoesPdfRacaoMunicao {
  acoesRealizadas?: string;
  despesasOperacionais?: string;
  omPrincipal?: string;
  nomeAssinante?: string;
  postoAssinante?: string;
  funcaoAssinante?: string;
}

/**
 * Motor comum do PDF de Ração (R-2) e Munição: ambos são apenas listas de
 * item/quantidade por OM, sem rateio de valor — a única diferença real é o
 * título do documento e as colunas extras (Munição tem NEE/NSN e Tipo).
 */
async function gerarPdfItensPorOM<
  TPlano extends { om: { nome: string; sigla: string; codUG: string | null }; responsavel: User },
>(params: {
  planos: TPlano[];
  operacao: OperacaoComOM;
  responsavel?: User;
  opcoes?: OpcoesPdfRacaoMunicao;
  docExistente?: jsPDF;
  tituloDocumento: string;
  nomeArquivoBase: string;
  colunasExtras: { header: string; width: number }[];
  linhasPorOm: (plano: TPlano) => { linha: (string | number)[]; quantidade: number }[];
}): Promise<jsPDF> {
  const {
    planos,
    operacao,
    responsavel,
    opcoes,
    docExistente,
    tituloDocumento,
    nomeArquivoBase,
    colunasExtras,
    linhasPorOm,
  } = params;

  const doc =
    docExistente ??
    new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  if (docExistente) {
    doc.addPage("a4", "landscape");
  }

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = 10;
  const marginRight = 10;
  const marginTop = 10;
  let currentY = marginTop;

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
  doc.text("MINISTÉRIO DA DEFESA", pageWidth / 2, currentY, { align: "center" });
  currentY += 5;
  doc.text("EXÉRCITO BRASILEIRO", pageWidth / 2, currentY, { align: "center" });
  currentY += 5;

  const omPrincipal =
    opcoes?.omPrincipal?.toUpperCase() ??
    (planos.length > 1
      ? operacao.om.nome.toUpperCase()
      : planos[0].om.nome.toUpperCase());

  doc.text(omPrincipal, pageWidth / 2, currentY, { align: "center" });
  currentY += 6;
  doc.setFontSize(9);
  doc.text(
    `${tituloDocumento.toUpperCase()} PARA ${operacao.nome.toUpperCase()}`,
    pageWidth / 2,
    currentY,
    { align: "center", maxWidth: pageWidth - 40 }
  );
  currentY += 10;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(tituloDocumento.toUpperCase(), pageWidth / 2, currentY, {
    align: "center",
  });
  currentY += 8;

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");

  const dataInicio = new Date(operacao.dataInicio);
  const dataFinal = new Date(operacao.dataFinal);
  const periodo = `${formatarDataCurta(dataInicio)} A ${formatarDataCurta(dataFinal)}`;
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
  doc.text(`${periodo}`, marginLeft + doc.getTextWidth("2. PERÍODO: "), currentY);
  currentY += 5;

  doc.setFont("helvetica", "bold");
  doc.text(`3. EFETIVO EMPREGADO: `, marginLeft, currentY);
  doc.setFont("helvetica", "normal");
  doc.text(
    efetivo,
    marginLeft + doc.getTextWidth("3. EFETIVO EMPREGADO: "),
    currentY
  );
  currentY += 10;

  const tableHead = [
    [
      "OM (UGE)\nCODUG",
      ...colunasExtras.map((c) => c.header),
      "QUANTIDADE",
      "MEMÓRIA DE CÁLCULO",
    ],
  ];
  const larguraFixa =
    30 + 20 + colunasExtras.reduce((acc, c) => acc + c.width, 0);
  const columnStyles: Record<number, Record<string, unknown>> = {
    0: { cellWidth: 30, overflow: "linebreak", halign: "center" },
  };
  colunasExtras.forEach((c, idx) => {
    columnStyles[idx + 1] = { cellWidth: c.width, overflow: "linebreak" };
  });
  columnStyles[colunasExtras.length + 1] = {
    cellWidth: 20,
    halign: "right",
  };
  columnStyles[colunasExtras.length + 2] = {
    cellWidth: 277 - larguraFixa,
    overflow: "linebreak",
  };

  let totalGeral = 0;

  planos.forEach((plano) => {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(
      `OM RESPONSÁVEL: ${plano.om.nome.toUpperCase()}`,
      marginLeft,
      currentY
    );
    currentY += 8;

    const linhasInfo = linhasPorOm(plano);
    const tableBody: (string | number)[][] = linhasInfo.map((l) => l.linha);
    const subtotal = linhasInfo.reduce((acc, l) => acc + l.quantidade, 0);
    tableBody.push([
      "SUBTOTAL",
      ...colunasExtras.map(() => ""),
      String(subtotal),
      "",
    ]);
    totalGeral += subtotal;

    autoTable(doc, {
      head: tableHead,
      body: tableBody,
      startY: currentY,
      theme: "grid",
      styles: { fontSize: 7, cellPadding: 1.2, overflow: "linebreak", lineWidth: 0.1 },
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
        if (data.row.index === tableBody.length - 1 && data.section === "body") {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fillColor = [240, 240, 240];
        }
      },
      margin: { left: marginLeft, right: marginRight },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    currentY = (doc as any).lastAutoTable.finalY + 10;

    if (currentY > pageHeight - 40) {
      doc.addPage();
      currentY = marginTop;
    }
  });

  if (planos.length > 1) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(`QUANTIDADE TOTAL GERAL: ${totalGeral}`, pageWidth / 2, currentY, {
      align: "center",
    });
    currentY += 15;
  }

  const hoje = new Date();
  const cidade = "MANAUS - AM";
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`${cidade}, ${formatarDataExtenso(hoje)}.`, pageWidth / 2, currentY, {
    align: "center",
  });
  currentY += 15;

  const assinanteNome = opcoes?.nomeAssinante;
  const assinantePosto = opcoes?.postoAssinante;
  const assinanteFuncao = opcoes?.funcaoAssinante;
  const responsavelDefault = planos[0]?.responsavel ?? responsavel;

  if (assinanteNome || responsavelDefault) {
    doc.setFont("helvetica", "bold");
    doc.text(
      assinanteNome
        ? `${assinantePosto ? assinantePosto + " " : ""}${assinanteNome.toUpperCase()}`
        : `${responsavelDefault!.postoGraduacao} ${responsavelDefault!.nomeCompleto.toUpperCase()}`,
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
    const siglaArquivo =
      planos.length > 1 ? "Consolidado" : planos[0].om.sigla.replace(/\s+/g, "_");
    doc.save(
      `${nomeArquivoBase}_${siglaArquivo}_${operacao.nome.replace(/\s+/g, "_")}.pdf`
    );
  }

  return doc;
}

export async function gerarPdfPlanoRacao(
  planos: PlanoRacaoComRelacoes | PlanoRacaoComRelacoes[],
  operacao: OperacaoComOM,
  responsavel?: User,
  opcoes?: OpcoesPdfRacaoMunicao,
  docExistente?: jsPDF
): Promise<jsPDF> {
  const planosArray = ([] as PlanoRacaoComRelacoes[]).concat(planos);
  return gerarPdfItensPorOM({
    planos: planosArray,
    operacao,
    responsavel,
    opcoes,
    docExistente,
    tituloDocumento: "PLANO DE RAÇÃO (R-2)",
    nomeArquivoBase: "plano_r2",
    colunasExtras: [{ header: "ITEM", width: 50 }],
    linhasPorOm: (plano) =>
      plano.itensRacaoR2.map((item) => ({
        linha: [
          `${item.om.sigla}\n(${item.om.codUG || ""})`,
          item.item,
          item.quantidade,
          prepararTextoParaTabela(item.memoria || ""),
        ],
        quantidade: item.quantidade,
      })),
  });
}

export async function gerarPdfPlanoMunicao(
  planos: PlanoMunicaoComRelacoes | PlanoMunicaoComRelacoes[],
  operacao: OperacaoComOM,
  responsavel?: User,
  opcoes?: OpcoesPdfRacaoMunicao,
  docExistente?: jsPDF
): Promise<jsPDF> {
  const planosArray = ([] as PlanoMunicaoComRelacoes[]).concat(planos);
  return gerarPdfItensPorOM({
    planos: planosArray,
    operacao,
    responsavel,
    opcoes,
    docExistente,
    tituloDocumento: "PLANO DE MUNIÇÃO",
    nomeArquivoBase: "plano_municao",
    colunasExtras: [
      { header: "NEE/NSN", width: 30 },
      { header: "TIPO", width: 40 },
    ],
    linhasPorOm: (plano) =>
      plano.itensMunicao.map((item) => ({
        linha: [
          `${item.om.sigla}\n(${item.om.codUG || ""})`,
          item.neeNsn,
          item.tipo,
          item.quantidade,
          prepararTextoParaTabela(item.memoria || ""),
        ],
        quantidade: item.quantidade,
      })),
  });
}
