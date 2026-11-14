import { Workbook, Worksheet } from "exceljs";

/**
 * Aba com os dados brutos (payload JSON) de cada despesa, usada para permitir
 * reimportar um plano a partir do mesmo xlsx gerado na exportação
 * (round-trip). As demais abas são apenas para leitura humana.
 */
export const SHEET_DADOS_BRUTOS = "Dados (não editar)";

export function obterOuCriarSheetDados(workbook: Workbook): Worksheet {
  let sheet = workbook.getWorksheet(SHEET_DADOS_BRUTOS);
  if (!sheet) {
    sheet = workbook.addWorksheet(SHEET_DADOS_BRUTOS);
    sheet.columns = [
      { header: "planoOmSigla", key: "planoOmSigla", width: 14 },
      { header: "planoTipo", key: "planoTipo", width: 20 },
      { header: "tipoLinha", key: "tipoLinha", width: 20 },
      { header: "payload", key: "payload", width: 120 },
    ];
    sheet.getRow(1).font = { bold: true };
  }
  return sheet;
}

export type TipoLinhaDados = "despesa" | "despesaOperacional";

export function adicionarLinhaDados(
  workbook: Workbook,
  planoOmSigla: string,
  planoTipo: string,
  tipoLinha: TipoLinhaDados,
  payload: unknown
): void {
  const sheet = obterOuCriarSheetDados(workbook);
  sheet.addRow({
    planoOmSigla,
    planoTipo,
    tipoLinha,
    payload: JSON.stringify(payload),
  });
}
