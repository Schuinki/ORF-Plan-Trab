/**
 * Motor único de agrupamento "por OM" usado por todos os geradores de
 * documento (PDF/Excel do Plano de Trabalho, e futuramente a DOR).
 *
 * Corrige o bug de "OM duplicada": antes, cada gerador agrupava despesas
 * por OM *dentro de um único Plano de Trabalho*, então uma OM com dois
 * Planos (mesmo tipo, mesma Operação — permitido de propósito) aparecia
 * em duas seções separadas. Aqui o agrupamento acontece sobre a lista
 * *já achatada* de despesas de todos os Planos recebidos, então uma OM
 * com múltiplos Planos sempre cai num único grupo.
 *
 * Também centraliza o filtro de "quais OMs entram" (omsIncluidas) e a
 * chave de agrupamento:
 * - "owner" — a OM titular do Plano de Trabalho (quem lançou/é responsável
 *   pela despesa). É a usada pelo Plano de Trabalho/carimbo: mesmo que uma
 *   despesa seja rateada para outra OM destino/compradora, o "OM
 *   RESPONSÁVEL" exibido continua sendo a OM titular do Plano — ela não
 *   muda em função do rateio.
 * - "destino" — a OM que efetivamente recebe/usa o recurso em cada rateio.
 * - "comprador" — a UG que empenha (usada pela DOR).
 */

export interface LinhaConsolidavel {
  omNomeDestino: string;
  codUGDestino: string;
  omNomeCompradora: string;
  codUGCompradora: string;
  /** OM titular do Plano de Trabalho de onde a linha veio (não muda por rateio). */
  omNomeOwner?: string;
  codUGOwner?: string;
}

export interface GrupoConsolidado<T> {
  omNome: string;
  codUG: string;
  linhas: T[];
}

export interface ConsolidadoResultado<T> {
  porOM: GrupoConsolidado<T>[];
}

export interface OpcoesConsolidado {
  /** CODUGs a incluir; se omitido, inclui todas as OMs presentes nas linhas. */
  omsIncluidas?: string[];
  /** "owner" (padrão, usado pelo Plano de Trabalho/"OM RESPONSÁVEL"), "destino" ou "comprador" (usado pela DOR). */
  chaveAgrupamento?: "owner" | "destino" | "comprador";
}

export function agruparConsolidado<T extends LinhaConsolidavel>(
  linhas: T[],
  opts?: OpcoesConsolidado
): ConsolidadoResultado<T> {
  const chave = opts?.chaveAgrupamento ?? "owner";
  const omsIncluidasSet = opts?.omsIncluidas
    ? new Set(opts.omsIncluidas)
    : null;

  const grupos = new Map<string, GrupoConsolidado<T>>();

  for (const linha of linhas) {
    const codUG =
      chave === "comprador"
        ? linha.codUGCompradora
        : chave === "destino"
          ? linha.codUGDestino
          : linha.codUGOwner || linha.codUGDestino;
    const omNome =
      chave === "comprador"
        ? linha.omNomeCompradora
        : chave === "destino"
          ? linha.omNomeDestino
          : linha.omNomeOwner || linha.omNomeDestino;
    const chaveGrupo = codUG || "SEM_OM";

    if (omsIncluidasSet && codUG && !omsIncluidasSet.has(codUG)) {
      continue;
    }

    if (!grupos.has(chaveGrupo)) {
      grupos.set(chaveGrupo, { omNome, codUG, linhas: [] });
    }
    grupos.get(chaveGrupo)!.linhas.push(linha);
  }

  return {
    porOM: Array.from(grupos.values()).sort((a, b) =>
      a.omNome.localeCompare(b.omNome)
    ),
  };
}
