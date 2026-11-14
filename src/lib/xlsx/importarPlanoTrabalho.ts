import ExcelJS from "exceljs";
import { SHEET_DADOS_BRUTOS, TipoLinhaDados } from "@/lib/xlsx/dadosBrutos";

export interface ItemImportado {
  linha: number;
  tipoLinha: TipoLinhaDados;
  payload: Record<string, unknown>;
}

export interface ErroImportacao {
  linha: number;
  mensagem: string;
}

export interface ResultadoLeituraImportacao {
  itens: ItemImportado[];
  erros: ErroImportacao[];
}

/**
 * Lê a aba de dados brutos de um xlsx gerado pelo próprio sistema e filtra
 * apenas as linhas que pertencem ao plano de destino (mesma OM e tipo).
 * Não é um importador de formato externo: é o round-trip do nosso próprio
 * export (ver seção E do plano de implementação).
 */
export async function lerArquivoImportacao(
  buffer: ArrayBuffer,
  planoOmSigla: string,
  planoTipo: string
): Promise<ResultadoLeituraImportacao> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const sheet = workbook.getWorksheet(SHEET_DADOS_BRUTOS);
  if (!sheet) {
    return {
      itens: [],
      erros: [
        {
          linha: 0,
          mensagem: `Planilha "${SHEET_DADOS_BRUTOS}" não encontrada. Use um arquivo .xlsx exportado pelo próprio sistema.`,
        },
      ],
    };
  }

  const itens: ItemImportado[] = [];
  const erros: ErroImportacao[] = [];

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // cabeçalho

    const omSigla = String(row.getCell(1).value ?? "");
    const tipo = String(row.getCell(2).value ?? "");
    const tipoLinha = String(row.getCell(3).value ?? "") as TipoLinhaDados;
    const payloadStr = String(row.getCell(4).value ?? "");

    if (omSigla !== planoOmSigla || tipo !== planoTipo) return;

    try {
      const payload = JSON.parse(payloadStr);
      itens.push({ linha: rowNumber, tipoLinha, payload });
    } catch {
      erros.push({
        linha: rowNumber,
        mensagem: "Dados corrompidos (JSON inválido) nesta linha",
      });
    }
  });

  return { itens, erros };
}
