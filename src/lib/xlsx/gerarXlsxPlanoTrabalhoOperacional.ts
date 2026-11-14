import ExcelJS, { Workbook } from "exceljs";
import {
  PlanoComRelacoes,
  OperacaoComOM,
  COLUNAS_ND,
  processarDespesasOperacionais,
  agruparPorOM,
} from "@/lib/pdf/gerarPdfPlanoTrabalhoOperacional";
import { baixarWorkbook, sanitizarNomeAba } from "@/lib/xlsx/download";
import { adicionarLinhaDados } from "@/lib/xlsx/dadosBrutos";
import { agruparConsolidado } from "@/lib/consolidado/construirConsolidado";
import { criarAbaComCabecalho } from "@/lib/xlsx/escreverCabecalhoXlsx";

const SUBTITULO = (operacaoNome: string) =>
  `PLANO DE TRABALHO LOGÍSTICO DE SOLICITAÇÃO DE RECURSOS ORÇAMENTÁRIOS E FINANCEIROS PARA ${operacaoNome}`;
const TITULO = "PLANO DE TRABALHO OPERACIONAL - GND 3/GND 4";

function colunas() {
  return [
    { header: "DESPESAS", key: "titulo", width: 30 },
    { header: "OM (UGE)", key: "om", width: 14 },
    { header: "CODUG", key: "codUG", width: 12 },
    ...COLUNAS_ND.map((codigo) => ({
      header: codigo,
      key: `nd_${codigo}`,
      width: 13,
    })),
    { header: "GND 3", key: "gnd3", width: 13 },
    { header: "GND 4", key: "gnd4", width: 13 },
    { header: "DETALHAMENTO / MEMÓRIA DE CÁLCULO", key: "detalhamento", width: 60 },
  ];
}

function escreverLinhaDespesa(
  sheet: ReturnType<Workbook["addWorksheet"]>,
  despesa: ReturnType<typeof processarDespesasOperacionais>[number]
) {
  const row: Record<string, string | number> = {
    titulo: despesa.titulo,
    om: despesa.omNome,
    codUG: despesa.codUG,
    gnd3: despesa.gnd3,
    gnd4: despesa.gnd4 || "",
    detalhamento: despesa.detalhamento,
  };
  COLUNAS_ND.forEach((codigo) => {
    row[`nd_${codigo}`] = despesa.valoresPorNd[codigo] || "";
  });
  sheet.addRow(row);
}

function escreverLinhaSubtotal(
  sheet: ReturnType<Workbook["addWorksheet"]>,
  subtotaisPorNd: Record<string, number>,
  gnd3: number,
  gnd4: number
) {
  const subtotalRow: Record<string, string | number> = {
    titulo: "SOMA POR ND E GP DE DESPESA",
    gnd3,
    gnd4: gnd4 || "",
  };
  COLUNAS_ND.forEach((codigo) => {
    subtotalRow[`nd_${codigo}`] = subtotaisPorNd[codigo] || 0;
  });
  const addedRow = sheet.addRow(subtotalRow);
  addedRow.font = { bold: true };
  addedRow.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF0F0F0" },
    };
  });
}

function registrarDadosBrutos(workbook: Workbook, plano: PlanoComRelacoes) {
  plano.despesasOperacionais.forEach((despesa) => {
    adicionarLinhaDados(
      workbook,
      plano.om.sigla,
      plano.tipo,
      "despesaOperacional",
      {
        omDestinoId: despesa.omDestinoId,
        omCompradoraId: despesa.omCompradoraId,
        titulo: despesa.titulo,
        objeto: despesa.objeto || undefined,
        objetivo: despesa.objetivo || undefined,
        finalidade: despesa.finalidade || undefined,
        memoriaCalculo: despesa.memoriaCalculo,
        pregaoUasg: despesa.pregaoUasg || undefined,
        situacaoPregao: despesa.situacaoPregao || undefined,
        observacaoPregao: despesa.observacaoPregao || undefined,
        naturezas: despesa.naturezas.map((n) => ({
          naturezaId: n.naturezaId,
          valor: Number(n.valor),
        })),
      }
    );
  });
}

/** Adiciona uma aba com a tabela de despesas de um plano Operacional (GND3 ou GND4). Retorna { gnd3, gnd4 } do plano. */
export function adicionarAbaPlanoOperacional(
  workbook: Workbook,
  plano: PlanoComRelacoes,
  operacaoNome: string
): { gnd3: number; gnd4: number } {
  const sheet = criarAbaComCabecalho(
    workbook,
    sanitizarNomeAba(`${plano.om.sigla} OP`),
    colunas(),
    {
      omPrincipal: plano.om.nome,
      subtitulo: SUBTITULO(operacaoNome),
      titulo: TITULO,
    }
  );

  const despesasProcessadas = processarDespesasOperacionais(
    plano.despesasOperacionais
  );
  const grupos = agruparPorOM(despesasProcessadas);

  registrarDadosBrutos(workbook, plano);

  let subtotalGnd3Plano = 0;
  let subtotalGnd4Plano = 0;

  grupos.forEach((grupo) => {
    grupo.despesas.forEach((despesa) => escreverLinhaDespesa(sheet, despesa));
    escreverLinhaSubtotal(
      sheet,
      grupo.subtotaisPorNd,
      grupo.subtotalGnd3,
      grupo.subtotalGnd4
    );
    subtotalGnd3Plano += grupo.subtotalGnd3;
    subtotalGnd4Plano += grupo.subtotalGnd4;
  });

  [...COLUNAS_ND.map((c) => `nd_${c}`), "gnd3", "gnd4"].forEach((key) => {
    sheet.getColumn(key).numFmt = "#,##0.00";
  });

  return { gnd3: subtotalGnd3Plano, gnd4: subtotalGnd4Plano };
}

/**
 * Adiciona uma aba por OM DESTINO, mesclando despesas operacionais de
 * todos os Planos de Trabalho recebidos (corrige o bug de "OM duplicada").
 */
export function adicionarAbasPorOMOperacional(
  workbook: Workbook,
  planos: PlanoComRelacoes[],
  operacaoNome: string,
  omsIncluidas?: string[]
): { gnd3: number; gnd4: number } {
  planos.forEach((plano) => registrarDadosBrutos(workbook, plano));

  const todasDespesas = planos.flatMap((plano) =>
    processarDespesasOperacionais(plano.despesasOperacionais)
  );

  const { porOM } = agruparConsolidado(todasDespesas, {
    chaveAgrupamento: "destino",
    omsIncluidas,
  });

  let totalGnd3 = 0;
  let totalGnd4 = 0;

  porOM.forEach((grupo) => {
    const sheet = criarAbaComCabecalho(
      workbook,
      sanitizarNomeAba(`${grupo.omNome} OP`),
      colunas(),
      {
        omPrincipal: grupo.omNome,
        subtitulo: SUBTITULO(operacaoNome),
        titulo: TITULO,
      }
    );

    let gnd3 = 0;
    let gnd4 = 0;
    const subtotaisPorNd: Record<string, number> = {};
    grupo.linhas.forEach((despesa) => {
      escreverLinhaDespesa(sheet, despesa);
      gnd3 += despesa.gnd3;
      gnd4 += despesa.gnd4;
      COLUNAS_ND.forEach((codigo) => {
        subtotaisPorNd[codigo] =
          (subtotaisPorNd[codigo] || 0) + (despesa.valoresPorNd[codigo] || 0);
      });
    });
    escreverLinhaSubtotal(sheet, subtotaisPorNd, gnd3, gnd4);
    totalGnd3 += gnd3;
    totalGnd4 += gnd4;

    [...COLUNAS_ND.map((c) => `nd_${c}`), "gnd3", "gnd4"].forEach((key) => {
      sheet.getColumn(key).numFmt = "#,##0.00";
    });
  });

  return { gnd3: totalGnd3, gnd4: totalGnd4 };
}

export async function gerarXlsxPlanoTrabalhoOperacional(
  planos: PlanoComRelacoes | PlanoComRelacoes[],
  operacao: OperacaoComOM,
  omsIncluidas?: string[]
): Promise<void> {
  const planosArray = ([] as PlanoComRelacoes[]).concat(planos);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SisPTrab";
  workbook.created = new Date();

  adicionarAbasPorOMOperacional(
    workbook,
    planosArray,
    operacao.nome,
    omsIncluidas
  );

  await baixarWorkbook(
    workbook,
    `plano_trabalho_operacional_${operacao.nome.replace(/\s+/g, "_")}.xlsx`
  );
}
