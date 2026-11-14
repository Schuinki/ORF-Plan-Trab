import { DespesaWithRelations } from "@/types/despesas";
import {
  PlanoComRelacoes as PlanoLogistico,
  processarDespesas,
} from "@/lib/pdf/gerarPdfPlanoTrabalho";
import {
  PlanoComRelacoes as PlanoOperacional,
  processarDespesasOperacionais,
} from "@/lib/pdf/gerarPdfPlanoTrabalhoOperacional";
import { agruparConsolidado } from "@/lib/consolidado/construirConsolidado";

export interface LinhaDor {
  omNome: string;
  codUG: string;
  gnd: "GND 3" | "GND 4";
  valor: number;
  descricao: string;
}

export interface DorPorGnd {
  gnd: "GND 3" | "GND 4";
  linhas: LinhaDor[];
  total: number;
}

type PlanoComTipo =
  | (PlanoLogistico & { tipo: "LOGISTICO" })
  | (PlanoOperacional & { tipo: "OPERACIONAL_GND3" | "OPERACIONAL_GND4" });

/**
 * Monta as linhas da DOR a partir dos Planos de Trabalho de uma operação,
 * agrupadas pela OM COMPRADORA (CODUG do empenho) — ao contrário do Plano
 * de Trabalho, que agrupa pela OM destino (carimbo). Retorna uma entrada
 * por GND presente nos dados (GND 3 e GND 4 são documentos/abas
 * inteiramente separados, como no modelo oficial).
 */
export function montarLinhasDor(
  planos: PlanoComTipo[],
  omsIncluidas?: string[]
): DorPorGnd[] {
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
    chaveAgrupamento: "comprador",
    omsIncluidas,
  });
  const { porOM: porOMOp } = agruparConsolidado(despesasOp, {
    chaveAgrupamento: "comprador",
    omsIncluidas,
  });

  const linhasGnd3: LinhaDor[] = [];
  const linhasGnd4: LinhaDor[] = [];

  // Logístico sempre implica GND 3 (garantido na validação de entrada).
  porOMLog.forEach((grupo) => {
    grupo.linhas.forEach((d) => {
      if (d.gnd3 > 0) {
        linhasGnd3.push({
          omNome: grupo.omNome,
          codUG: grupo.codUG,
          gnd: "GND 3",
          valor: d.gnd3,
          descricao: d.descricao,
        });
      }
    });
  });

  // Operacional: cada despesa pertence a um único GND (garantido na
  // validação de entrada — um plano OPERACIONAL_GND3 só aceita naturezas
  // de GND 3, e um OPERACIONAL_GND4 só aceita naturezas de GND 4).
  porOMOp.forEach((grupo) => {
    grupo.linhas.forEach((d) => {
      if (d.gnd3 > 0) {
        linhasGnd3.push({
          omNome: grupo.omNome,
          codUG: grupo.codUG,
          gnd: "GND 3",
          valor: d.gnd3,
          descricao: d.titulo,
        });
      }
      if (d.gnd4 > 0) {
        linhasGnd4.push({
          omNome: grupo.omNome,
          codUG: grupo.codUG,
          gnd: "GND 4",
          valor: d.gnd4,
          descricao: d.titulo,
        });
      }
    });
  });

  const resultado: DorPorGnd[] = [];
  if (linhasGnd3.length > 0) {
    resultado.push({
      gnd: "GND 3",
      linhas: linhasGnd3,
      total: linhasGnd3.reduce((s, l) => s + l.valor, 0),
    });
  }
  if (linhasGnd4.length > 0) {
    resultado.push({
      gnd: "GND 4",
      linhas: linhasGnd4,
      total: linhasGnd4.reduce((s, l) => s + l.valor, 0),
    });
  }
  return resultado;
}
