import ExcelJS, { Worksheet } from "exceljs";
import { PlanoComRelacoes as PlanoLogistico } from "@/lib/pdf/gerarPdfPlanoTrabalho";
import { PlanoComRelacoes as PlanoOperacional } from "@/lib/pdf/gerarPdfPlanoTrabalhoOperacional";
import { montarLinhasDor } from "@/lib/documentos/gerarDor";
import { baixarWorkbook, sanitizarNomeAba } from "@/lib/xlsx/download";

type PlanoComTipo =
  | (PlanoLogistico & { tipo: "LOGISTICO" })
  | (PlanoOperacional & { tipo: "OPERACIONAL_GND3" | "OPERACIONAL_GND4" });

export interface OperacaoParaDor {
  nome: string;
  orgaoRequisitante?: string | null;
  responsavelDemanda?: string | null;
  emailResponsavel?: string | null;
  telefoneResponsavel?: string | null;
  dorNumero?: string | null;
  dorData?: string | Date | null;
  finalidade?: string | null;
  motivacao?: string | null;
  consequenciaNaoAtendimento?: string | null;
  observacoes?: string | null;
}

export interface OpcoesDor {
  nomeAssinante?: string;
  postoAssinante?: string;
  funcaoAssinante?: string;
}

const OBSERVACOES_PADRAO =
  "(1) As memórias de cálculo detalhadas e parametrizadas das despesas custeadas serão mantidas em arquivos próprios (P Trab);\n" +
  '(2) O bem e/ou serviço requisitado está de acordo com a "Descrição" da Ação Orçamentária e com a "Caracterização" do Plano Orçamentário do Cadastro de Ações do Sistema Integrado de Planejamento e Orçamento (SIOP);\n' +
  "(3) Os saldos não aplicados serão restituídos ao EMCFA com tempestividade; e\n" +
  "(4) Serão observados os potenciais riscos nas aquisições de bens e serviços da Mensagem SIAFI nº 2021/0612168, de 17 de novembro de 2021, item 1.";

function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatarData(data: Date): string {
  return data.toLocaleDateString("pt-BR");
}

function escreverLinhaRotulo(
  sheet: Worksheet,
  linha: number,
  rotulo: string,
  valor: string,
  colFinal = "D"
) {
  sheet.mergeCells(`A${linha}:${colFinal}${linha}`);
  const cell = sheet.getCell(`A${linha}`);
  cell.value = `${rotulo}${valor}`;
  cell.alignment = { wrapText: true, vertical: "top" };
}

function escreverSecao(sheet: Worksheet, linha: number, titulo: string): number {
  sheet.mergeCells(`A${linha}:D${linha}`);
  const cell = sheet.getCell(`A${linha}`);
  cell.value = titulo;
  cell.font = { bold: true };
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFEFEFEF" },
  };
  return linha + 1;
}

function adicionarAbaDorPorGnd(
  workbook: ExcelJS.Workbook,
  operacao: OperacaoParaDor,
  gnd: "GND 3" | "GND 4",
  linhas: { omNome: string; codUG: string; valor: number; descricao: string }[],
  total: number,
  opcoes?: OpcoesDor
) {
  const sheet = workbook.addWorksheet(
    sanitizarNomeAba(`DOR ${gnd.replace("GND ", "GND-")}`)
  );
  sheet.getColumn(1).width = 22;
  sheet.getColumn(2).width = 30;
  sheet.getColumn(3).width = 18;
  sheet.getColumn(4).width = 70;

  let linha = 1;

  // Cabeçalho
  sheet.mergeCells(`A${linha}:D${linha + 3}`);
  const cabecalho = sheet.getCell(`A${linha}`);
  const dorData = operacao.dorData ? new Date(operacao.dorData) : new Date();
  cabecalho.value =
    "MINISTÉRIO DA DEFESA\nEXÉRCITO BRASILEIRO\nCOMANDO MILITAR DE ÁREA\n\n" +
    "Documento de Oficialização da Requisição\n" +
    `DOR Nº ${operacao.dorNumero || "XX"} - ${gnd}\n` +
    formatarData(dorData);
  cabecalho.font = { bold: true, size: 11 };
  cabecalho.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  sheet.getRow(linha).height = 90;
  linha += 5;

  linha = escreverSecao(sheet, linha, "DADOS DO ÓRGÃO REQUISITANTE");
  escreverLinhaRotulo(sheet, linha, "Órgão: ", operacao.orgaoRequisitante || "");
  linha += 1;
  escreverLinhaRotulo(
    sheet,
    linha,
    "Responsável pela demanda: ",
    operacao.responsavelDemanda || ""
  );
  linha += 2;
  escreverLinhaRotulo(sheet, linha, "E-mail: ", operacao.emailResponsavel || "");
  linha += 1;
  escreverLinhaRotulo(sheet, linha, "Telefone: ", operacao.telefoneResponsavel || "");
  linha += 2;

  escreverLinhaRotulo(sheet, linha, "Ação Orçamentária (AO): ", "A cargo do MD");
  linha += 1;
  escreverLinhaRotulo(sheet, linha, "Plano Orçamentário (PO): ", "A cargo do MD");
  linha += 2;

  linha = escreverSecao(sheet, linha, "OBJETO DA REQUISIÇÃO");
  escreverLinhaRotulo(sheet, linha, "Evento: ", operacao.nome);
  linha += 2;

  linha = escreverSecao(sheet, linha, "DESCRIÇÃO DO ITEM (BEM E/OU SERVIÇO)");
  const headerRow = sheet.getRow(linha);
  headerRow.values = ["UGR/UGE", "GND", "VALOR (R$)", "Descrição"];
  headerRow.font = { bold: true };
  linha += 1;

  linhas.forEach((item) => {
    const row = sheet.getRow(linha);
    row.values = [
      `${item.omNome}\n(${item.codUG})`,
      gnd.replace("GND ", ""),
      item.valor,
      item.descricao,
    ];
    row.alignment = { wrapText: true, vertical: "top" };
    linha += 1;
  });

  const totalRow = sheet.getRow(linha);
  totalRow.values = [`TOTAL ${gnd}`, "", total, ""];
  totalRow.font = { bold: true };
  totalRow.getCell(3).numFmt = "#,##0.00";
  sheet.getColumn(3).numFmt = "#,##0.00";
  linha += 2;

  linha = escreverSecao(sheet, linha, "FINALIDADE");
  escreverLinhaRotulo(sheet, linha, "", operacao.finalidade || "");
  linha += 2;

  linha = escreverSecao(sheet, linha, "MOTIVAÇÃO");
  escreverLinhaRotulo(sheet, linha, "", operacao.motivacao || "");
  linha += 2;

  linha = escreverSecao(sheet, linha, "CONSEQUÊNCIA DO NÃO ATENDIMENTO");
  escreverLinhaRotulo(sheet, linha, "", operacao.consequenciaNaoAtendimento || "");
  linha += 2;

  linha = escreverSecao(sheet, linha, "OBSERVAÇÕES");
  const obsCell = sheet.getCell(`A${linha}`);
  sheet.mergeCells(`A${linha}:D${linha + 3}`);
  obsCell.value = operacao.observacoes || OBSERVACOES_PADRAO;
  obsCell.alignment = { wrapText: true, vertical: "top" };
  linha += 6;

  sheet.mergeCells(`A${linha}:D${linha}`);
  sheet.getCell(`A${linha}`).value = `Manaus-AM, ${formatarData(new Date())}.`;
  sheet.getCell(`A${linha}`).alignment = { horizontal: "center" };
  linha += 3;

  if (opcoes?.nomeAssinante) {
    sheet.mergeCells(`A${linha}:D${linha}`);
    const nomeCell = sheet.getCell(`A${linha}`);
    nomeCell.value = `${opcoes.postoAssinante ? opcoes.postoAssinante + " " : ""}${opcoes.nomeAssinante.toUpperCase()}`;
    nomeCell.font = { bold: true };
    nomeCell.alignment = { horizontal: "center" };
    linha += 1;
    sheet.mergeCells(`A${linha}:D${linha}`);
    const funcaoCell = sheet.getCell(`A${linha}`);
    funcaoCell.value = opcoes.funcaoAssinante || "Responsável pela Formalização da Requisição";
    funcaoCell.alignment = { horizontal: "center" };
  }
}

/**
 * Gera o workbook da DOR de uma operação — uma aba por GND presente nos
 * dados (GND 3 e GND 4 são documentos inteiramente separados, como no
 * modelo oficial COTER), agrupando as despesas pela OM COMPRADORA
 * (CODUG usado no empenho).
 */
export async function gerarXlsxDor(
  planos: PlanoComTipo[],
  operacao: OperacaoParaDor,
  omsIncluidas?: string[],
  opcoes?: OpcoesDor
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SisPTrab";
  workbook.created = new Date();

  const dorPorGnd = montarLinhasDor(planos, omsIncluidas);

  if (dorPorGnd.length === 0) {
    throw new Error(
      "Nenhuma despesa encontrada para gerar a DOR desta operação."
    );
  }

  dorPorGnd.forEach(({ gnd, linhas, total }) => {
    adicionarAbaDorPorGnd(workbook, operacao, gnd, linhas, total, opcoes);
  });

  await baixarWorkbook(workbook, `DOR_${operacao.nome.replace(/\s+/g, "_")}.xlsx`);
}
