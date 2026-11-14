import ExcelJS from "exceljs";
import { PlanoComRelacoes as PlanoLogistico } from "@/lib/pdf/gerarPdfPlanoTrabalho";
import { PlanoComRelacoes as PlanoOperacional } from "@/lib/pdf/gerarPdfPlanoTrabalhoOperacional";
import { adicionarAbasPorOM } from "@/lib/xlsx/gerarXlsxPlanoTrabalho";
import { adicionarAbasPorOMOperacional } from "@/lib/xlsx/gerarXlsxPlanoTrabalhoOperacional";
import { baixarWorkbook } from "@/lib/xlsx/download";
import { processarDespesas } from "@/lib/pdf/gerarPdfPlanoTrabalho";
import { processarDespesasOperacionais } from "@/lib/pdf/gerarPdfPlanoTrabalhoOperacional";
import { agruparConsolidado } from "@/lib/consolidado/construirConsolidado";
import { DespesaWithRelations } from "@/types/despesas";

interface OperacaoBasica {
  nome: string;
  omsParticipantes?: {
    omId: string;
    valorLimite: number | string;
    om: { sigla: string; codUG: string | null };
  }[];
}

type PlanoComTipo =
  | (PlanoLogistico & { tipo: "LOGISTICO" })
  | (PlanoOperacional & { tipo: "OPERACIONAL_GND3" | "OPERACIONAL_GND4" });

/**
 * Monta a aba "Resumo por OM": uma linha por OM (teto, total Logístico,
 * total Operacional, total geral) + uma linha TOTAL somando todas as OMs —
 * subtotal por OM e total geral aparecem juntos na mesma visão, como no
 * modelo oficial (aba RESUMO).
 */
function adicionarAbaResumoPorOM(
  workbook: ExcelJS.Workbook,
  planos: PlanoComTipo[],
  operacao: OperacaoBasica,
  omsIncluidas?: string[]
) {
  const logisticos = planos.filter(
    (p): p is PlanoLogistico & { tipo: "LOGISTICO" } => p.tipo === "LOGISTICO"
  );
  const operacionais = planos.filter(
    (p): p is PlanoOperacional & { tipo: "OPERACIONAL_GND3" | "OPERACIONAL_GND4" } =>
      p.tipo === "OPERACIONAL_GND3" || p.tipo === "OPERACIONAL_GND4"
  );

  const despesasLog = logisticos.flatMap((p) =>
    processarDespesas(p.despesas as unknown as DespesaWithRelations[])
  );
  const despesasOp = operacionais.flatMap((p) =>
    processarDespesasOperacionais(p.despesasOperacionais)
  );

  const { porOM: porOMLog } = agruparConsolidado(despesasLog, {
    chaveAgrupamento: "destino",
    omsIncluidas,
  });
  const { porOM: porOMOp } = agruparConsolidado(despesasOp, {
    chaveAgrupamento: "destino",
    omsIncluidas,
  });

  const totalLogPorCodUG = new Map(
    porOMLog.map((g) => [g.codUG, g.linhas.reduce((s, d) => s + d.gnd3, 0)])
  );
  const totalOpPorCodUG = new Map(
    porOMOp.map((g) => [g.codUG, g.linhas.reduce((s, d) => s + d.gnd3 + d.gnd4, 0)])
  );

  const codUGs = new Set([...totalLogPorCodUG.keys(), ...totalOpPorCodUG.keys()]);
  const nomePorCodUG = new Map([
    ...porOMLog.map((g) => [g.codUG, g.omNome] as const),
    ...porOMOp.map((g) => [g.codUG, g.omNome] as const),
  ]);
  const tetoPorCodUG = new Map(
    (operacao.omsParticipantes || [])
      .filter((p) => p.om.codUG)
      .map((p) => [p.om.codUG as string, Number(p.valorLimite)])
  );

  const sheet = workbook.addWorksheet("Resumo por OM");
  sheet.columns = [
    { header: "Comando Participante", key: "om", width: 28 },
    { header: "Teto", key: "teto", width: 15 },
    { header: "P Trab Log", key: "log", width: 15 },
    { header: "P Trab Op", key: "op", width: 15 },
    { header: "Total", key: "total", width: 15 },
  ];
  sheet.getRow(1).font = { bold: true };

  let totalTeto = 0;
  let totalLog = 0;
  let totalOp = 0;

  Array.from(codUGs)
    .sort((a, b) => (nomePorCodUG.get(a) || "").localeCompare(nomePorCodUG.get(b) || ""))
    .forEach((codUG) => {
      const teto = tetoPorCodUG.get(codUG) || 0;
      const log = totalLogPorCodUG.get(codUG) || 0;
      const op = totalOpPorCodUG.get(codUG) || 0;
      totalTeto += teto;
      totalLog += log;
      totalOp += op;
      sheet.addRow({
        om: nomePorCodUG.get(codUG) || codUG,
        teto,
        log,
        op,
        total: log + op,
      });
    });

  const totalRow = sheet.addRow({
    om: "TOTAL",
    teto: totalTeto,
    log: totalLog,
    op: totalOp,
    total: totalLog + totalOp,
  });
  totalRow.font = { bold: true };
  totalRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0F0F0" } };
  });

  ["teto", "log", "op", "total"].forEach((key) => {
    sheet.getColumn(key).numFmt = "#,##0.00";
  });
}

/**
 * Gera um único workbook consolidando todos os planos (Logístico e
 * Operacional) de uma operação, com uma aba de resumo por OM e uma aba
 * final de totais gerais.
 */
export async function gerarXlsxConsolidado(
  planos: PlanoComTipo[],
  operacao: OperacaoBasica,
  omsIncluidas?: string[]
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SisPTrab";
  workbook.created = new Date();

  let totalGnd3 = 0;
  let totalGnd4 = 0;

  const logisticos = planos.filter(
    (p): p is PlanoLogistico & { tipo: "LOGISTICO" } => p.tipo === "LOGISTICO"
  );
  const operacionais = planos.filter(
    (p): p is PlanoOperacional & { tipo: "OPERACIONAL_GND3" | "OPERACIONAL_GND4" } =>
      p.tipo === "OPERACIONAL_GND3" || p.tipo === "OPERACIONAL_GND4"
  );

  // Uma aba por OM, mesclando despesas de todos os Planos daquela OM (em
  // vez de uma aba por Plano — corrige a OM duplicada).
  if (logisticos.length > 0) {
    totalGnd3 += adicionarAbasPorOM(
      workbook,
      logisticos,
      operacao.nome,
      omsIncluidas
    );
  }
  if (operacionais.length > 0) {
    const { gnd3, gnd4 } = adicionarAbasPorOMOperacional(
      workbook,
      operacionais,
      operacao.nome,
      omsIncluidas
    );
    totalGnd3 += gnd3;
    totalGnd4 += gnd4;
  }

  adicionarAbaResumoPorOM(workbook, planos, operacao, omsIncluidas);

  const totaisSheet = workbook.addWorksheet("Totais Gerais");
  totaisSheet.columns = [
    { header: "Item", key: "item", width: 30 },
    { header: "Valor", key: "valor", width: 18 },
  ];
  totaisSheet.getRow(1).font = { bold: true };
  totaisSheet.addRow({ item: "GND 3", valor: totalGnd3 });
  if (totalGnd4 > 0) {
    totaisSheet.addRow({ item: "GND 4", valor: totalGnd4 });
  }
  const totalRow = totaisSheet.addRow({
    item: "VALOR TOTAL",
    valor: totalGnd3 + totalGnd4,
  });
  totalRow.font = { bold: true };
  totaisSheet.getColumn("valor").numFmt = "#,##0.00";

  await baixarWorkbook(
    workbook,
    `consolidado_${operacao.nome.replace(/\s+/g, "_")}.xlsx`
  );
}
