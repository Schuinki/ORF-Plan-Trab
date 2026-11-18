/**
 * Valores por etapa de ração (QR/QS) — editáveis em Configurações > Preços.
 * Valores oficiais 2026 conforme Diretriz de Prontidão Logística 2026
 * (QR R$ 7,00 / QS R$ 10,00).
 */
export const VALORES_REFEICAO = {
  QR: 7,
  QS: 10,
};

/** Máximo de dias de etapa completa (Classe I) — editável em Configurações > Preços. */
export const CONFIG_MAX_DIAS_ETAPA = { valor: 8 };

/** Aplica overrides de valor por etapa de ração vindos de Configurações > Preços. */
export function aplicarOverridesValoresRefeicao(
  overrides: Record<string, { valor?: number }>
): void {
  for (const tipo of Object.keys(VALORES_REFEICAO) as Array<
    keyof typeof VALORES_REFEICAO
  >) {
    const valor = overrides[tipo]?.valor;
    if (typeof valor === "number" && valor > 0) {
      VALORES_REFEICAO[tipo] = valor;
    }
  }
}

/** Aplica override do máximo de dias de etapa vindo de Configurações > Preços. */
export function aplicarOverrideMaxDiasEtapa(
  overrides: Record<string, { valor?: number }>
): void {
  const valor = overrides.MAX_DIAS?.valor;
  if (typeof valor === "number" && valor > 0) {
    CONFIG_MAX_DIAS_ETAPA.valor = valor;
  }
}

/** Lista fixa de Tipo de OM, na ordem em que deve aparecer no formulário. */
export const TIPOS_OM = [
  { value: "COMPANHIA", label: "Companhia" },
  { value: "BATALHAO", label: "Batalhão" },
  { value: "GRANDE_UNIDADE", label: "Grande Unidade" },
  { value: "GRANDE_COMANDO", label: "Grande Comando" },
  { value: "COMANDO_MILITAR_DE_AREA", label: "Comando Militar de Área" },
  { value: "ORGAO_DE_DIRECAO_SETORIAL", label: "Órgão de Direção Setorial" },
  { value: "ORGAO_DE_DIRECAO_GERAL", label: "Órgão de Direção Geral" },
  { value: "OUTROS", label: "Outros" },
] as const;

const LABEL_POR_TIPO_OM: Record<string, string> = Object.fromEntries(
  TIPOS_OM.map((t) => [t.value, t.label])
);

/** Converte o valor bruto do enum TipoOM (ex.: "GRANDE_UNIDADE") no rótulo em PT-BR para exibição. */
export function getTipoOMLabel(tipo: string): string {
  return LABEL_POR_TIPO_OM[tipo] || tipo;
}

/**
 * Lista de cargos/funções disponíveis ao cadastrar um usuário — informativo,
 * independente da Role de permissão do sistema (Comandante/S4/Integrante/
 * Super Admin). Um usuário com Role "Integrante", por exemplo, pode ocupar o
 * cargo de S1, S2 ou S3 sem que isso altere suas permissões no sistema.
 */
export const CARGOS_USUARIO = [
  "Comandante",
  "Subcomandante",
  "S1 — Pessoal",
  "S2 — Inteligência",
  "S3 — Operações",
  "S4 — Logística",
  "Fiscal Administrativo",
  "Ajudante-Geral",
  "Chefe de Seção",
  "Outro",
] as const;
