import { Workbook, Worksheet, Column } from "exceljs";
import { DadosCabecalhoDocumento, montarLinhasCabecalho } from "@/lib/documentos/montarDadosCabecalho";

/**
 * Escreve o cabeçalho oficial (Ministério da Defesa/Exército/Comando +
 * título) no topo de uma planilha — num único bloco de célula mesclada com
 * quebras de linha, igual ao modelo oficial COTER (sem imagem de brasão;
 * os modelos reais usam só texto). O PDF já tem esse cabeçalho com brasão;
 * aqui é a versão simplificada para Excel.
 *
 * Deve ser chamada ANTES de definir `sheet.columns` (que escreveria um
 * cabeçalho de colunas na linha 1, sobrepondo este bloco). Retorna o
 * índice da próxima linha livre, onde a linha de títulos das colunas deve
 * começar.
 */
export function escreverCabecalhoXlsx(
  sheet: Worksheet,
  dados: DadosCabecalhoDocumento,
  numColunas: number
): number {
  const colFinal = letraColuna(numColunas);
  const linhaInicio = 1;
  const linhaFim = 4;

  sheet.mergeCells(`A${linhaInicio}:${colFinal}${linhaFim}`);
  const cell = sheet.getCell(`A${linhaInicio}`);
  cell.value = montarLinhasCabecalho(dados).join("\n");
  cell.font = { bold: true, size: 11 };
  cell.alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };
  sheet.getRow(linhaInicio).height = 80;

  return linhaFim + 2; // uma linha em branco antes da tabela
}

interface ColunaComHeader {
  header: string;
  key: string;
  width?: number;
}

/**
 * Cria uma aba já com o cabeçalho oficial no topo e a linha de títulos das
 * colunas logo abaixo — para uso direto no lugar de `workbook.addWorksheet`
 * + `sheet.columns = COLUNAS`. A partir do retorno, `sheet.addRow({...})`
 * continua funcionando normalmente (acrescenta linhas após o cabeçalho).
 */
export function criarAbaComCabecalho(
  workbook: Workbook,
  nomeAba: string,
  colunas: ColunaComHeader[],
  dadosCabecalho: DadosCabecalhoDocumento
): Worksheet {
  const sheet = workbook.addWorksheet(nomeAba);

  const proximaLinha = escreverCabecalhoXlsx(
    sheet,
    dadosCabecalho,
    colunas.length
  );

  // Define largura/chave das colunas sem deixar o exceljs escrever um
  // cabeçalho automático na linha 1 (que já está ocupada pelo texto do
  // cabeçalho oficial).
  sheet.columns = colunas.map(
    ({ header: _header, ...resto }) => resto
  ) as Column[];

  const headerRow = sheet.getRow(proximaLinha);
  colunas.forEach((coluna, index) => {
    headerRow.getCell(index + 1).value = coluna.header;
  });
  headerRow.font = { bold: true };
  headerRow.alignment = { horizontal: "center", vertical: "middle" };
  headerRow.commit();

  return sheet;
}

function letraColuna(n: number): string {
  let resultado = "";
  let num = n;
  while (num > 0) {
    const resto = (num - 1) % 26;
    resultado = String.fromCharCode(65 + resto) + resultado;
    num = Math.floor((num - 1) / 26);
  }
  return resultado || "A";
}
