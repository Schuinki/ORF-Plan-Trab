// Classe IX - Viaturas - Manutenção

export type GrupoViatura = "GP1" | "GP2" | "GP3" | "GP4";

export const GRUPOS_VIATURA: Record<GrupoViatura, string> = {
  GP1: "Leve (GP1)",
  GP2: "Média (GP2)",
  GP3: "Pesada (GP3)",
  GP4: "Extra Pesada (GP4)",
};

export type TipoViatura =
  // Viaturas Não Blindadas
  | "VTP_SEDAN_MEDIO"
  | "VTP_SEDAN_COMPACTO"
  | "VTP_MINIVAN_7_PSG"
  | "VTP_PICKUP_4X4_CAB_DUPLA"
  | "VTP_VAN_EXECUTIVA_16_PSG"
  | "VTE_AMBULANCIA_SUPORTE_AVANCADO"
  | "VTE_AMBULANCIA_SIMPLES_REMOCAO"
  | "VTNE_VUC_BAU"
  | "VTP_MICRO_ONIBUS_ADM"
  | "VTNE_9T_BAU"
  | "ONIBUS_INTERMUNICIPAL"
  | "ONIBUS_RODOVIARIO"
  | "VTNE_BAU_13T"
  | "CAVALO_MECANICO_45T"
  | "CAVALO_MECANICO_60T"
  | "MARRUA_3_4"
  | "PICKUP_VOP2_L200"
  | "AMBULANCIA_SR_4X4_MARRUA"
  | "MARRUA_1_5T"
  | "CAMINHOES_1_5_5T"
  | "MICRO_ONIBUS_OP"
  | "VTNE_5T_WORKER_ATEGO"
  | "ONIBUS_URBANO"
  | "ONIBUS_CHOQUE_RODOVIARIO"
  | "CAVALO_MECANICO_60T_PLUS"
  | "VR_ATE_1_5T"
  | "VR_CISTEN_ATE_1500L"
  | "COZINHA_CAMPANHA"
  | "PRANCHA_45T"
  | "PRANCHA_60T"
  | "MOTOCICLETA_ESTAFETA"
  | "MOTOCICLETA_POLICIAL_GP_III"
  | "QUADRICICLO"
  | "MOTOCICLETA_POLICIAL_GP_II"
  | "MOTOCICLETA_POLICIAL_GP_I"
  // Viaturas Blindadas
  | "BLINDADA_AMERICANA"
  | "BLINDADA_ALEMA"
  | "BLINDADA_IDV"
  | "BLINDADA_ENGESA"
  // Outro
  | "OUTRO";

export interface ViaturaInfo {
  nome: string;
  categoria: "NAO_BLINDADA" | "BLINDADA";
  grupo: GrupoViatura;
  custoMntDia: number;
  valorAcionamento: number;
}

// Valores de custoMntDia desta tabela conferidos linha a linha contra a
// Diretriz de Prontidão Logística 2026, Apêndice 2, item 5 ("Tabela
// complementar com valores aproximados Cl IX"). Vários valores anteriores
// estavam desatualizados (a maioria das viaturas pesadas/ônibus/caminhões
// estava ~1,45x acima do valor oficial); corrigidos aqui.
export const VIATURAS: Record<Exclude<TipoViatura, "OUTRO">, ViaturaInfo> = {
  // Não Blindadas - Leves (GP1): valorAcionamento <= 400
  VTP_SEDAN_MEDIO: {
    nome: "VTP Sedã Médio",
    categoria: "NAO_BLINDADA",
    grupo: "GP1",
    custoMntDia: 26.0,
    valorAcionamento: 400.0,
  },
  VTP_SEDAN_COMPACTO: {
    nome: "VTP Sedã Compacto",
    categoria: "NAO_BLINDADA",
    grupo: "GP1",
    custoMntDia: 16.0,
    valorAcionamento: 400.0,
  },
  VTP_MINIVAN_7_PSG: {
    nome: "VTP Minivan 7 Psg",
    categoria: "NAO_BLINDADA",
    grupo: "GP1",
    custoMntDia: 19.0,
    valorAcionamento: 400.0,
  },
  VTP_PICKUP_4X4_CAB_DUPLA: {
    nome: "VTP Pick-up 4x4 Cabine Dupla",
    categoria: "NAO_BLINDADA",
    grupo: "GP1",
    custoMntDia: 37.0,
    valorAcionamento: 400.0,
  },
  VTP_VAN_EXECUTIVA_16_PSG: {
    nome: "VTP Van Executiva 16 Psg",
    categoria: "NAO_BLINDADA",
    grupo: "GP1",
    custoMntDia: 50.0,
    valorAcionamento: 400.0,
  },
  VTE_AMBULANCIA_SUPORTE_AVANCADO: {
    nome: "VTE Amb Suporte Avançado",
    categoria: "NAO_BLINDADA",
    grupo: "GP1",
    custoMntDia: 66.0,
    valorAcionamento: 400.0,
  },
  VTE_AMBULANCIA_SIMPLES_REMOCAO: {
    nome: "VTE Amb Simples Remoção",
    categoria: "NAO_BLINDADA",
    grupo: "GP1",
    custoMntDia: 50.0,
    valorAcionamento: 400.0,
  },
  // Médias (GP2): valorAcionamento ~650
  VTNE_VUC_BAU: {
    nome: "VTNE VUC com carroceria baú",
    categoria: "NAO_BLINDADA",
    grupo: "GP2",
    custoMntDia: 38.0,
    valorAcionamento: 650.0,
  },
  VTP_MICRO_ONIBUS_ADM: {
    nome: "VTP Micro-ônibus (Adm)",
    categoria: "NAO_BLINDADA",
    grupo: "GP2",
    custoMntDia: 91.0,
    valorAcionamento: 650.0,
  },
  // Pesadas (GP3): valorAcionamento ~910
  VTNE_9T_BAU: {
    nome: "VTNE 9 t Baú",
    categoria: "NAO_BLINDADA",
    grupo: "GP3",
    custoMntDia: 138.0,
    valorAcionamento: 910.0,
  },
  ONIBUS_INTERMUNICIPAL: {
    nome: "Ônibus Intermunicipal",
    categoria: "NAO_BLINDADA",
    grupo: "GP3",
    custoMntDia: 190.0,
    valorAcionamento: 910.0,
  },
  ONIBUS_RODOVIARIO: {
    nome: "Ônibus Rodoviário",
    categoria: "NAO_BLINDADA",
    grupo: "GP3",
    custoMntDia: 257.0,
    valorAcionamento: 910.0,
  },
  // Extra Pesadas (GP4): valorAcionamento >= 1200
  VTNE_BAU_13T: {
    nome: "VTNE Baú 13 t",
    categoria: "NAO_BLINDADA",
    grupo: "GP4",
    custoMntDia: 190.0,
    valorAcionamento: 1200.0,
  },
  CAVALO_MECANICO_45T: {
    nome: "VTNE Cav Mec 45 t",
    categoria: "NAO_BLINDADA",
    grupo: "GP4",
    custoMntDia: 140.0,
    valorAcionamento: 1200.0,
  },
  CAVALO_MECANICO_60T: {
    nome: "VTNE Cav Mec 60 t",
    categoria: "NAO_BLINDADA",
    grupo: "GP4",
    custoMntDia: 204.0,
    valorAcionamento: 1200.0,
  },
  // Operacionais - Leves (GP1)
  MARRUA_3_4: {
    nome: "VTNE ¾ Marruá",
    categoria: "NAO_BLINDADA",
    grupo: "GP1",
    custoMntDia: 112.0,
    valorAcionamento: 400.0,
  },
  PICKUP_VOP2_L200: {
    nome: "VTNE Pick-up VOP 2 (Mitsubishi L200)",
    categoria: "NAO_BLINDADA",
    grupo: "GP1",
    custoMntDia: 56.0,
    valorAcionamento: 400.0,
  },
  AMBULANCIA_SR_4X4_MARRUA: {
    nome: "VTE Amb SR 4×4 (Marruá)",
    categoria: "NAO_BLINDADA",
    grupo: "GP1",
    custoMntDia: 164.0,
    valorAcionamento: 400.0,
  },
  MARRUA_1_5T: {
    nome: "VTNE 1½ t AM 31 Marruá",
    categoria: "NAO_BLINDADA",
    grupo: "GP1",
    custoMntDia: 132.0,
    valorAcionamento: 400.0,
  },
  // Operacionais - Médias (GP2)
  CAMINHOES_1_5_5T: {
    nome: "Caminhões Op de 1,5 t (exclusive) até 5 t",
    categoria: "NAO_BLINDADA",
    grupo: "GP2",
    custoMntDia: 132.0,
    valorAcionamento: 650.0,
  },
  MICRO_ONIBUS_OP: {
    nome: "VTP Micro-ônibus (Op)",
    categoria: "NAO_BLINDADA",
    grupo: "GP2",
    custoMntDia: 138.0,
    valorAcionamento: 650.0,
  },
  // Operacionais - Pesadas (GP3)
  VTNE_5T_WORKER_ATEGO: {
    nome: "VTNE 5 t (Worker/Atego)",
    categoria: "NAO_BLINDADA",
    grupo: "GP3",
    custoMntDia: 206.0,
    valorAcionamento: 910.0,
  },
  ONIBUS_URBANO: {
    nome: "VTP Ônibus Urbano",
    categoria: "NAO_BLINDADA",
    grupo: "GP3",
    custoMntDia: 223.0,
    valorAcionamento: 910.0,
  },
  ONIBUS_CHOQUE_RODOVIARIO: {
    nome: "VTP Ônibus Choque e Rodoviário",
    categoria: "NAO_BLINDADA",
    grupo: "GP3",
    custoMntDia: 302.0,
    valorAcionamento: 910.0,
  },
  // Operacionais - Extra Pesadas (GP4)
  CAVALO_MECANICO_60T_PLUS: {
    nome: "VTNE Cav Mec 60 t e caminhões acima de 10 t",
    categoria: "NAO_BLINDADA",
    grupo: "GP4",
    custoMntDia: 328.0,
    valorAcionamento: 1200.0,
  },
  // Reboques/Especiais - Leves (GP1)
  VR_ATE_1_5T: {
    nome: "VR até 1,5 t",
    categoria: "NAO_BLINDADA",
    grupo: "GP1",
    custoMntDia: 8.0,
    valorAcionamento: 150.0,
  },
  VR_CISTEN_ATE_1500L: {
    nome: "VR Cisten até 1500 L",
    categoria: "NAO_BLINDADA",
    grupo: "GP1",
    custoMntDia: 9.0,
    valorAcionamento: 150.0,
  },
  COZINHA_CAMPANHA: {
    nome: "Cozinha de Campanha",
    categoria: "NAO_BLINDADA",
    grupo: "GP1",
    custoMntDia: 35.0,
    valorAcionamento: 310.0,
  },
  // Médias (GP2)
  PRANCHA_45T: {
    nome: "VSRNE Prancha 45 t",
    categoria: "NAO_BLINDADA",
    grupo: "GP2",
    custoMntDia: 33.0,
    valorAcionamento: 600.0,
  },
  PRANCHA_60T: {
    nome: "VSRNE Prancha 60 t",
    categoria: "NAO_BLINDADA",
    grupo: "GP2",
    custoMntDia: 50.0,
    valorAcionamento: 600.0,
  },
  // Motocicletas - Leves (GP1)
  MOTOCICLETA_ESTAFETA: {
    nome: "VTP Motocicleta Estafeta",
    categoria: "NAO_BLINDADA",
    grupo: "GP1",
    custoMntDia: 3.0,
    valorAcionamento: 200.0,
  },
  MOTOCICLETA_POLICIAL_GP_III: {
    nome: "Vtr Mct Policial Gp III",
    categoria: "NAO_BLINDADA",
    grupo: "GP1",
    custoMntDia: 7.0,
    valorAcionamento: 300.0,
  },
  QUADRICICLO: {
    nome: "Quadriciclo",
    categoria: "NAO_BLINDADA",
    grupo: "GP1",
    custoMntDia: 14.0,
    valorAcionamento: 300.0,
  },
  MOTOCICLETA_POLICIAL_GP_II: {
    nome: "Vtr Mct Policial Gp II",
    categoria: "NAO_BLINDADA",
    grupo: "GP1",
    custoMntDia: 28.0,
    valorAcionamento: 320.0,
  },
  MOTOCICLETA_POLICIAL_GP_I: {
    nome: "Vtr Mct Policial Gp I",
    categoria: "NAO_BLINDADA",
    grupo: "GP3",
    custoMntDia: 37.0,
    valorAcionamento: 950.0,
  },
  // Blindadas - Extra Pesadas (GP4)
  // Valores de custo diário por série de blindado conforme Diretriz de
  // Prontidão Logística 2026, Apêndice 2, item 5.f.3 ("Custo diário por
  // Blindado das Mnt com Base histórica do Sistema de Mnt, Contratos, FMS
  // e SLI"). Os valores anteriores aqui (R$1.476,70/1.011,39/1.656,90/
  // 1.330,00) estavam desatualizados/divergentes da tabela oficial.
  BLINDADA_AMERICANA: {
    nome: "Série Blindada Americana",
    categoria: "BLINDADA",
    grupo: "GP4",
    custoMntDia: 879.02,
    valorAcionamento: 3800.0,
  },
  BLINDADA_ALEMA: {
    nome: "Série Blindada Alemã",
    categoria: "BLINDADA",
    grupo: "GP4",
    custoMntDia: 451.32,
    valorAcionamento: 48000.0,
  },
  BLINDADA_IDV: {
    nome: "Série IDV",
    categoria: "BLINDADA",
    grupo: "GP4",
    custoMntDia: 253.95,
    valorAcionamento: 4000.0,
  },
  BLINDADA_ENGESA: {
    nome: "Série Engesa",
    categoria: "BLINDADA",
    grupo: "GP4",
    custoMntDia: 105.73,
    valorAcionamento: 628.0,
  },
};

export interface ItemViatura {
  tipoViatura: TipoViatura;
  nomeCustomizado?: string; // Para viaturas do tipo "OUTRO"
  grupoCustomizado?: GrupoViatura; // Para viaturas do tipo "OUTRO"
  quantidade: number;
  diasUso: number;
  custoMntDiaCustomizado?: number;
  valorAcionamentoCustomizado?: number;
}

export interface ParametrosClasseIX {
  viaturas: ItemViatura[];
}

/**
 * Calcula o número de ciclos de 30 dias
 * Exemplos: 20 dias = 1 ciclo, 35 dias = 2 ciclos, 62 dias = 3 ciclos
 */
export function calcularCiclos30Dias(dias: number): number {
  return Math.ceil(dias / 30);
}

/**
 * Obtém o custo de manutenção por dia efetivo
 */
export function getCustoMntDiaEfetivo(item: ItemViatura): number {
  if (item.custoMntDiaCustomizado !== undefined) {
    return item.custoMntDiaCustomizado;
  }

  if (item.tipoViatura === "OUTRO") {
    return 0;
  }

  return VIATURAS[item.tipoViatura as Exclude<TipoViatura, "OUTRO">]
    .custoMntDia;
}

/**
 * Obtém o valor de acionamento efetivo
 */
export function getValorAcionamentoEfetivo(item: ItemViatura): number {
  if (item.valorAcionamentoCustomizado !== undefined) {
    return item.valorAcionamentoCustomizado;
  }

  if (item.tipoViatura === "OUTRO") {
    return 0;
  }

  return VIATURAS[item.tipoViatura as Exclude<TipoViatura, "OUTRO">]
    .valorAcionamento;
}

/**
 * Obtém o nome da viatura
 */
export function getNomeViatura(item: ItemViatura): string {
  if (item.tipoViatura === "OUTRO") {
    return item.nomeCustomizado || "Viatura Customizada";
  }
  return VIATURAS[item.tipoViatura as Exclude<TipoViatura, "OUTRO">].nome;
}

/**
 * Obtém o grupo da viatura (GP1, GP2, GP3, GP4)
 */
export function getGrupoViatura(item: ItemViatura): GrupoViatura {
  if (item.tipoViatura === "OUTRO") {
    return item.grupoCustomizado || "GP1";
  }
  return VIATURAS[item.tipoViatura as Exclude<TipoViatura, "OUTRO">].grupo;
}

/**
 * Obtém o texto do grupo da viatura (ex: "Leve (GP1)")
 */
export function getGrupoViaturaTexto(item: ItemViatura): string {
  const grupo = getGrupoViatura(item);
  return GRUPOS_VIATURA[grupo];
}

/**
 * Lista todas as viaturas disponíveis
 */
export function listarTodasViaturas() {
  return Object.entries(VIATURAS).map(([tipo, info]) => ({
    tipo: tipo as TipoViatura,
    info,
  }));
}

/**
 * Aplica overrides de preço (vindos de Configurações > Preços) sobre a tabela
 * VIATURAS em memória. Chaves desconhecidas são ignoradas.
 */
export function aplicarOverridesViaturas(
  overrides: Record<string, Partial<Pick<ViaturaInfo, "custoMntDia" | "valorAcionamento">>>
): void {
  for (const [chave, valores] of Object.entries(overrides)) {
    const viatura = (VIATURAS as Record<string, ViaturaInfo>)[chave];
    if (viatura) {
      Object.assign(viatura, valores);
    }
  }
}

/**
 * Calcula o custo de manutenção de uma viatura
 * Fórmula: (n° de dias × valor diário de manutenção) + (nº de ciclos de 30 dias × valor de acionamento)
 */
function calcularCustoViatura(item: ItemViatura): number {
  const custoMntDia = getCustoMntDiaEfetivo(item);
  const valorAcionamento = getValorAcionamentoEfetivo(item);
  const ciclos = calcularCiclos30Dias(item.diasUso);

  const custoManutencao = item.diasUso * custoMntDia;
  const custoAcionamento = ciclos * valorAcionamento;
  const custoTotal = custoManutencao + custoAcionamento;

  return item.quantidade * custoTotal;
}

/**
 * Formata valor em reais
 */
function formatarValor(valor: number): string {
  return valor.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Cálculo principal CLASSE IX
 */
export function calcularClasseIX(
  params: ParametrosClasseIX,
  unidade?: string,
  nomeOperacao?: string,
  naturezas?: string[]
) {
  const { viaturas } = params;

  if (!viaturas || viaturas.length === 0) {
    throw new Error("Nenhuma viatura fornecida");
  }

  let valorTotal = 0;
  const detalhamentoItens: string[] = [];

  viaturas.forEach((item) => {
    const nomeViatura = getNomeViatura(item);
    const grupoTexto = getGrupoViaturaTexto(item);
    const grupo = getGrupoViatura(item);
    const custoMntDia = getCustoMntDiaEfetivo(item);
    const valorAcionamento = getValorAcionamentoEfetivo(item);
    const custoItem = calcularCustoViatura(item);

    valorTotal += custoItem;

    // Formato: → 04 Vtr AP OP Pesadas (GP3) B3, Custo Diário MEM(R$ 285,00) x 30 dias/mês + recurso complementar (R$ 910,00) x 4 Vtr AP OP Pesadas : R$ 37.840,00
    const qtdFormatada = String(item.quantidade).padStart(2, "0");
    const grupoNome = grupoTexto.split(" (")[0]; // Ex: "Pesada" de "Pesada (GP3)"

    detalhamentoItens.push(
      `→ ${qtdFormatada} ${nomeViatura} ${grupoNome}s (${grupo}), Custo Diário MEM(R$ ${formatarValor(custoMntDia)}) x ${item.diasUso} dias/mês + recurso complementar (R$ ${formatarValor(valorAcionamento)}) x ${item.quantidade} ${nomeViatura} ${grupoNome}: R$ ${formatarValor(custoItem)}`
    );
  });

  const valorTotalFinal = Number(valorTotal.toFixed(2));
  const totalFormatado = `R$ ${formatarValor(valorTotalFinal)}`;
  const unidadeTexto = unidade || "OM não identificada";
  const operacaoTexto = nomeOperacao || "operação";
  const textoPadrao = `Aquisição de peças e material para manutenção corretiva e preventiva das Viaturas empregadas na ${operacaoTexto}.`;

  // Usar naturezas dinâmicas ou fallback para padrão
  const naturezasTexto =
    naturezas && naturezas.length > 0 ? naturezas.join(" e ") : "33.90.30";

  const detalhamento = `${naturezasTexto} – Destinado ao ${unidadeTexto}. ${textoPadrao}

${detalhamentoItens.join("\n")}

→ Total Mnt Vtr: ${totalFormatado}
→ Conforme contrato 35/2023 - UASG 160482`;

  return {
    valorTotal: valorTotalFinal,
    detalhamento,
  };
}
