import ExcelJS from "exceljs";
import { criarAbaComCabecalho } from "@/lib/xlsx/escreverCabecalhoXlsx";
import { baixarWorkbook } from "@/lib/xlsx/download";

export interface ItemRacaoParaXlsx {
  item: string;
  quantidade: number;
  memoria: string | null;
  om: { nome: string; sigla: string; codUG: string | null };
}

export interface PlanoR2ParaXlsx {
  titulo: string;
  itensRacaoR2: ItemRacaoParaXlsx[];
  operacao: { nome: string };
  om: { nome: string; sigla: string };
}

/**
 * Gera o workbook do Plano R-2 (itens de ração), uma única aba com os
 * itens agrupados por OM e o total geral de quantidade ao final.
 */
export async function gerarXlsxPlanoR2(
  plano: PlanoR2ParaXlsx
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SisPTrab";
  workbook.created = new Date();

  const sheet = criarAbaComCabecalho(
    workbook,
    "Plano R-2",
    [
      { header: "OM", key: "om", width: 30 },
      { header: "Item", key: "item", width: 35 },
      { header: "Quantidade", key: "quantidade", width: 15 },
      { header: "Memória de Cálculo", key: "memoria", width: 50 },
    ],
    {
      omPrincipal: plano.om.nome,
      subtitulo: `PLANO DE RAÇÃO (R-2) PARA ${plano.operacao.nome}`,
      titulo: "PLANO R-2",
    }
  );

  let total = 0;
  plano.itensRacaoR2.forEach((item) => {
    total += item.quantidade;
    sheet.addRow({
      om: `${item.om.sigla}${item.om.codUG ? ` (UG: ${item.om.codUG})` : ""}`,
      item: item.item,
      quantidade: item.quantidade,
      memoria: item.memoria || "",
    });
  });

  const totalRow = sheet.addRow({
    om: "TOTAL",
    quantidade: total,
  });
  totalRow.font = { bold: true };

  await baixarWorkbook(
    workbook,
    `plano_r2_${plano.om.sigla}_${plano.operacao.nome.replace(/\s+/g, "_")}.xlsx`
  );
}
