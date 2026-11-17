export const VALORES_REFEICAO = {
  QR: 6,
  QS: 9,
};

export const MAX_DIAS_ETAPA = 8;

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
