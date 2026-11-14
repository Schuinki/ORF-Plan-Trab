/**
 * CLASSE IV — MATERIAL DE CONSTRUÇÃO E ENGENHARIA
 *
 * Cálculo baseado em lista de materiais com quantidade e valor unitário.
 * Fórmula: custo = Σ(quantidade × valor_unitario)
 */

export interface MaterialConstrucao {
  descricao: string;
  quantidade: number;
  valorUnitario: number;
}

export interface ParametrosClasseIV {
  materiais: MaterialConstrucao[];
}

export interface ResultadoClasseIV {
  valorTotal: number;
  carimbo: string;
}

export function calcularClasseIV(
  params: ParametrosClasseIV,
  unidade?: string,
  nomeOperacao?: string,
  naturezas?: string[]
): ResultadoClasseIV {
  const materiaisValidos = (params.materiais || []).filter(
    (m) => m.descricao && m.quantidade > 0 && m.valorUnitario > 0
  );

  if (materiaisValidos.length === 0) {
    throw new Error("Deve haver pelo menos um material válido");
  }

  const itensDetalhados = materiaisValidos.map((m) => ({
    descricao: m.descricao,
    quantidade: m.quantidade,
    valorUnitario: m.valorUnitario,
    subtotal: Number((m.quantidade * m.valorUnitario).toFixed(2)),
  }));

  const total = itensDetalhados.reduce((sum, item) => sum + item.subtotal, 0);
  const totalFinal = Number(total.toFixed(2));
  const totalFormatado = `R$ ${totalFinal.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  const memoriaCalculo = itensDetalhados
    .map(
      (item) =>
        `→ ${item.descricao}: ${item.quantidade} x R$ ${item.valorUnitario.toFixed(
          2
        )} = R$ ${item.subtotal.toFixed(2)}`
    )
    .join("\n");

  const unidadeTexto = unidade || "OM não identificada";
  const operacaoTexto = nomeOperacao || "operação";
  const textoPadrao = `Aquisição de materiais de construção e engenharia para emprego no contexto da ${operacaoTexto}.`;

  const naturezasTexto =
    naturezas && naturezas.length > 0 ? naturezas.join(" e ") : "33.90.30";

  const carimbo = `${naturezasTexto} – Destinado ao ${unidadeTexto}. ${textoPadrao}
Memória de Cálculo:

${memoriaCalculo}

Total: ${totalFormatado}`;

  return { valorTotal: totalFinal, carimbo };
}
