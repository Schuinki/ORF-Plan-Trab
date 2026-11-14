/**
 * CLASSE X — MATERIAL NÃO CLASSIFICADO
 *
 * Cálculo direto: custo = quantidade × valor_unitario
 */

export interface ParametrosClasseX {
  quantidade: number;
  valorUnitario: number;
  descricaoDetalhada: string;
}

export interface ResultadoClasseX {
  valorTotal: number;
  carimbo: string;
}

export function calcularClasseX(
  params: ParametrosClasseX,
  unidade?: string,
  nomeOperacao?: string,
  naturezas?: string[]
): ResultadoClasseX {
  const { quantidade, valorUnitario, descricaoDetalhada } = params;

  if (!quantidade || quantidade <= 0 || !valorUnitario || valorUnitario <= 0) {
    throw new Error("Informe quantidade e valor unitário maiores que zero");
  }

  const total = quantidade * valorUnitario;
  const totalFinal = Number(total.toFixed(2));
  const totalFormatado = `R$ ${totalFinal.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
  const unidadeTexto = unidade || "OM não identificada";
  const operacaoTexto = nomeOperacao || "operação";
  const textoPadrao = `Aquisição de material não classificado para emprego durante a ${operacaoTexto}.`;

  const naturezasTexto =
    naturezas && naturezas.length > 0 ? naturezas.join(" e ") : "33.90.30";

  const carimbo = `${naturezasTexto} – Destinado ao ${unidadeTexto}. ${textoPadrao}
Memória de Cálculo:

Descrição: ${descricaoDetalhada || "Não especificado"}

→ ${quantidade} un × R$ ${valorUnitario.toFixed(2)} = ${totalFormatado}

Total: ${totalFormatado}`;

  return { valorTotal: totalFinal, carimbo };
}
