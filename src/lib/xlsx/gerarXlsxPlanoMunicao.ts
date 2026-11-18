import ExcelJS from "exceljs";
import { criarAbaComCabecalho } from "@/lib/xlsx/escreverCabecalhoXlsx";
import { baixarWorkbook } from "@/lib/xlsx/download";

export interface ItemMunicaoParaXlsx {
  neeNsn: string;
  tipo: string;
  quantidade: number;
  memoria: string | null;
  om: { nome: string; sigla: string; codUG: string | null };
}

export interface PlanoMunicaoParaXlsx {
  titulo: string;
  itensMunicao: ItemMunicaoParaXlsx[];
  operacao: { nome: string };
  om: { nome: string; sigla: string };
}

/**
 * Gera o workbook do Plano de Munição, uma única aba com os itens
 * agrupados por OM e o total geral de quantidade ao final.
 */
export async function gerarXlsxPlanoMunicao(
  plano: PlanoMunicaoParaXlsx
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SisPTrab";
  workbook.created = new Date();

  const sheet = criarAbaComCabecalho(
    workbook,
    "Plano Munição",
    [
      { header: "OM", key: "om", width: 30 },
      { header: "NEE/NSN", key: "neeNsn", width: 20 },
      { header: "Tipo", key: "tipo", width: 30 },
      { header: "Quantidade", key: "quantidade", width: 15 },
      { header: "Memória de Cálculo", key: "memoria", width: 50 },
    ],
    {
      omPrincipal: plano.om.nome,
      subtitulo: `PLANO DE MUNIÇÃO PARA ${plano.operacao.nome}`,
      titulo: "PLANO DE MUNIÇÃO",
    }
  );

  let total = 0;
  plano.itensMunicao.forEach((item) => {
    total += item.quantidade;
    sheet.addRow({
      om: `${item.om.sigla}${item.om.codUG ? ` (UG: ${item.om.codUG})` : ""}`,
      neeNsn: item.neeNsn,
      tipo: item.tipo,
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
    `plano_municao_${plano.om.sigla}_${plano.operacao.nome.replace(/\s+/g, "_")}.xlsx`
  );
}
