export const TIPOS_ANEXO = ["PTRAB_ASSINADO", "DOR_ASSINADO"] as const;
export type TipoAnexo = (typeof TIPOS_ANEXO)[number];
