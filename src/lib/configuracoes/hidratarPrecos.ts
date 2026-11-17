/**
 * Hidratação client-side dos preços customizados (Configurações > Preços).
 *
 * Busca os overrides salvos no banco e aplica (via mutação em memória) sobre
 * as tabelas estáticas de cada classe*.ts. Como todos os consumidores dessas
 * tabelas (FormularioClasseX.tsx, blotterCalculo.ts) são client components que
 * compartilham a mesma instância de módulo no bundle do browser, uma única
 * chamada no mount do dashboard é suficiente para que o resto do app passe a
 * usar os valores customizados, sem precisar mudar a assinatura de nenhuma
 * função de cálculo existente.
 */

import { aplicarOverridesManutencaoII } from "../calculos/classeII";
import {
  aplicarOverridesPrecoCombustivelNacional,
  aplicarOverridesPrecoCombustivelFallback,
  aplicarOverridesConsumoViaturas,
  aplicarOverridesConsumoEquipamentosCombustivel,
} from "../calculos/classeIII";
import { aplicarOverridesArmamentos } from "../calculos/classeV";
import { aplicarOverridesEquipamentosEngenharia } from "../calculos/classeVI";
import { aplicarOverridesEquipamentosEletronicos } from "../calculos/classeVII";
import { aplicarOverridesKitsSaude } from "../calculos/classeVIII";
import { aplicarOverridesViaturas } from "../calculos/classeIX";

interface ConfiguracaoPrecoDTO {
  classe: string;
  grupo: string;
  chave: string;
  dados: Record<string, number>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AplicadorPorGrupo = (overrides: Record<string, any>) => void;

const APLICADORES: Record<string, AplicadorPorGrupo> = {
  MANUTENCAO_II: aplicarOverridesManutencaoII,
  COMBUSTIVEL_MEDIA_NACIONAL: aplicarOverridesPrecoCombustivelNacional,
  COMBUSTIVEL_FALLBACK_ESTADO: aplicarOverridesPrecoCombustivelFallback,
  COMBUSTIVEL_CONSUMO_VIATURA: aplicarOverridesConsumoViaturas,
  COMBUSTIVEL_CONSUMO_EQUIPAMENTO: aplicarOverridesConsumoEquipamentosCombustivel,
  ARMAMENTO_MANUTENCAO: aplicarOverridesArmamentos,
  EQUIPAMENTO_ENGENHARIA_MANUTENCAO: aplicarOverridesEquipamentosEngenharia,
  EQUIPAMENTO_ELETRONICO_MANUTENCAO: aplicarOverridesEquipamentosEletronicos,
  KIT_SAUDE: aplicarOverridesKitsSaude,
  VIATURA_MANUTENCAO: aplicarOverridesViaturas,
};

let hidratado = false;

/**
 * Busca todos os overrides de preço salvos e aplica sobre as tabelas estáticas
 * em memória. Idempotente o suficiente para ser chamado a cada mount do
 * dashboard (sempre busca dados frescos), mas nunca roda duas vezes em paralelo.
 */
export async function hidratarPrecosGlobais(): Promise<void> {
  try {
    const response = await fetch("/api/configuracoes/precos", { cache: "no-store" });
    if (!response.ok) return;

    const configuracoes: ConfiguracaoPrecoDTO[] = await response.json();

    const porGrupo = new Map<string, Record<string, Record<string, number>>>();
    for (const config of configuracoes) {
      if (!porGrupo.has(config.grupo)) {
        porGrupo.set(config.grupo, {});
      }
      porGrupo.get(config.grupo)![config.chave] = config.dados;
    }

    for (const [grupo, overrides] of porGrupo.entries()) {
      APLICADORES[grupo]?.(overrides);
    }

    hidratado = true;
  } catch (error) {
    console.error("Erro ao hidratar preços customizados:", error);
  }
}

export function precosJaHidratados(): boolean {
  return hidratado;
}
