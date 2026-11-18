import ExcelJS, { Workbook } from "exceljs";
import { DespesaWithRelations } from "@/types/despesas";
import {
  PlanoComRelacoes,
  OperacaoComOM,
  processarDespesas,
  agruparDespesasPorOM,
} from "@/lib/pdf/gerarPdfPlanoTrabalho";
import { baixarWorkbook, sanitizarNomeAba } from "@/lib/xlsx/download";
import { adicionarLinhaDados } from "@/lib/xlsx/dadosBrutos";
import { agruparConsolidado } from "@/lib/consolidado/construirConsolidado";
import { criarAbaComCabecalho } from "@/lib/xlsx/escreverCabecalhoXlsx";
import {
  montarDadosOperacaoCabecalho,
  OperacaoParaCabecalho,
} from "@/lib/documentos/montarDadosCabecalho";

const SUBTITULO = (operacaoNome: string) =>
  `PLANO DE TRABALHO LOGÍSTICO DE SOLICITAÇÃO DE RECURSOS ORÇAMENTÁRIOS E FINANCEIROS PARA ${operacaoNome}`;
const TITULO = "PLANO DE TRABALHO LOGÍSTICO";

const COLUNAS = [
  { header: "DESPESAS", key: "descricao", width: 35 },
  { header: "OM (UGE)", key: "om", width: 14 },
  { header: "CODUG", key: "codUG", width: 12 },
  { header: "33.90.30", key: "valor30", width: 13 },
  { header: "33.90.39", key: "valor39", width: 13 },
  { header: "GND 3", key: "gnd3", width: 13 },
  { header: "LITROS", key: "litros", width: 11 },
  { header: "PREÇO UNITÁRIO", key: "precoUnitario", width: 14 },
  { header: "PREÇO TOTAL", key: "precoTotal", width: 14 },
  { header: "DETALHAMENTO / MEMÓRIA DE CÁLCULO", key: "memoria", width: 60 },
];

function escreverLinhaDespesa(
  sheet: ReturnType<Workbook["addWorksheet"]>,
  despesa: ReturnType<typeof processarDespesas>[number]
) {
  sheet.addRow({
    descricao: despesa.descricao,
    om: despesa.omNome,
    codUG: despesa.codUG,
    valor30: despesa.valor30,
    valor39: despesa.valor39,
    gnd3: despesa.gnd3,
    litros: despesa.litros ?? "",
    precoUnitario: despesa.precoUnitario ?? "",
    precoTotal: despesa.precoTotalCombustivel ?? "",
    memoria: despesa.memoriaCalculo,
  });
}

function escreverLinhaSubtotal(
  sheet: ReturnType<Workbook["addWorksheet"]>,
  valor30: number,
  valor39: number,
  gnd3: number
) {
  const subtotalRow = sheet.addRow({
    descricao: "SOMA POR ND E GP DE DESPESA",
    valor30,
    valor39,
    gnd3,
  });
  subtotalRow.font = { bold: true };
  subtotalRow.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF0F0F0" },
    };
  });
}

function registrarDadosBrutos(workbook: Workbook, plano: PlanoComRelacoes) {
  plano.despesas.forEach((despesa) => {
    adicionarLinhaDados(workbook, plano.om.sigla, plano.tipo, "despesa", {
      classeId: despesa.classeId,
      tipoId: despesa.tipoId,
      descricao: despesa.descricao,
      parametros: despesa.parametros,
      valorTotal: Number(despesa.valorCalculado),
      valorCombustivel: despesa.valorCombustivel
        ? Number(despesa.valorCombustivel)
        : undefined,
      oms: despesa.oms.map((o) => ({
        omDestinoId: o.omDestinoId,
        omCompradoraId: o.omCompradoraId,
        percentual: Number(o.percentual),
      })),
      naturezas: despesa.despesasNaturezas.map((n) => ({
        naturezaId: n.naturezaId,
        percentual: Number(n.percentual),
      })),
    });
  });
}

/** Adiciona uma aba com a tabela de despesas de um plano LOGISTICO. Retorna o subtotal GND3 do plano. */
export function adicionarAbaPlanoLogistico(
  workbook: Workbook,
  plano: PlanoComRelacoes,
  operacaoNome: string
): number {
  const sheet = criarAbaComCabecalho(
    workbook,
    sanitizarNomeAba(`${plano.om.sigla} LOG`),
    COLUNAS,
    {
      omPrincipal: plano.om.nome,
      subtitulo: SUBTITULO(operacaoNome),
      titulo: TITULO,
    }
  );

  const despesasProcessadas = processarDespesas(
    plano.despesas as unknown as DespesaWithRelations[]
  );
  const grupos = agruparDespesasPorOM(despesasProcessadas);

  registrarDadosBrutos(workbook, plano);

  let subtotalPlano = 0;

  grupos.forEach((grupo) => {
    grupo.despesas.forEach((despesa) => escreverLinhaDespesa(sheet, despesa));
    escreverLinhaSubtotal(
      sheet,
      grupo.subtotal30,
      grupo.subtotal39,
      grupo.subtotalGnd3
    );
    subtotalPlano += grupo.subtotalGnd3;
  });

  ["valor30", "valor39", "gnd3", "precoUnitario", "precoTotal"].forEach(
    (key) => {
      const col = sheet.getColumn(key);
      col.numFmt = '#,##0.00';
    }
  );

  return subtotalPlano;
}

/**
 * Adiciona uma aba por OM DESTINO, mesclando despesas de todos os Planos
 * de Trabalho recebidos (corrige o bug de "OM duplicada": uma OM com dois
 * Planos de Trabalho na mesma Operação cai num único grupo/aba, em vez de
 * uma aba por Plano). Retorna o total geral (GND3) somado entre todas as OMs.
 */
export function adicionarAbasPorOM(
  workbook: Workbook,
  planos: PlanoComRelacoes[],
  operacao: string | OperacaoParaCabecalho,
  omsIncluidas?: string[]
): number {
  const operacaoNome = typeof operacao === "string" ? operacao : operacao.nome;
  const dadosOperacao =
    typeof operacao === "string" ? undefined : montarDadosOperacaoCabecalho(operacao);

  planos.forEach((plano) => registrarDadosBrutos(workbook, plano));

  const todasDespesas = planos.flatMap((plano) =>
    processarDespesas(plano.despesas as unknown as DespesaWithRelations[], {
      nome: plano.om.nome,
      codUG: plano.om.codUG,
    })
  );

  const { porOM } = agruparConsolidado(todasDespesas, {
    chaveAgrupamento: "owner",
    omsIncluidas,
  });

  let totalGeralGnd3 = 0;

  porOM.forEach((grupo) => {
    const sheet = criarAbaComCabecalho(
      workbook,
      sanitizarNomeAba(`${grupo.omNome} LOG`),
      COLUNAS,
      {
        omPrincipal: grupo.omNome,
        subtitulo: SUBTITULO(operacaoNome),
        titulo: TITULO,
        dadosOperacao,
      }
    );

    let subtotal30 = 0;
    let subtotal39 = 0;
    let subtotalGnd3 = 0;
    grupo.linhas.forEach((despesa) => {
      escreverLinhaDespesa(sheet, despesa);
      subtotal30 += despesa.valor30;
      subtotal39 += despesa.valor39;
      subtotalGnd3 += despesa.gnd3;
    });
    escreverLinhaSubtotal(sheet, subtotal30, subtotal39, subtotalGnd3);
    totalGeralGnd3 += subtotalGnd3;

    ["valor30", "valor39", "gnd3", "precoUnitario", "precoTotal"].forEach(
      (key) => {
        sheet.getColumn(key).numFmt = "#,##0.00";
      }
    );
  });

  return totalGeralGnd3;
}

export async function gerarXlsxPlanoTrabalho(
  planos: PlanoComRelacoes | PlanoComRelacoes[],
  operacao: OperacaoComOM,
  omsIncluidas?: string[]
): Promise<void> {
  const planosArray = ([] as PlanoComRelacoes[]).concat(planos);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SisPTrab";
  workbook.created = new Date();

  adicionarAbasPorOM(workbook, planosArray, operacao, omsIncluidas);

  const siglaArquivo =
    planosArray.length > 1
      ? "Consolidado"
      : planosArray[0].om.sigla.replace(/\s+/g, "_");
  await baixarWorkbook(
    workbook,
    `plano_trabalho_${siglaArquivo}_${operacao.nome.replace(/\s+/g, "_")}.xlsx`
  );
}
