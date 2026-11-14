/**
 * Rótulos de exibição do status de um Plano de Trabalho. O valor salvo no
 * banco (enum StatusPlano) continua RASCUNHO/EM_ANALISE/APROVADO/REPROVADO
 * — só o texto mostrado ao usuário muda.
 */
export const STATUS_PLANO_LABELS: Record<string, string> = {
  RASCUNHO: "Não enviado",
  EM_ANALISE: "Aguardando",
  APROVADO: "Autorizado",
  REPROVADO: "Reprovado",
};

export function getStatusPlanoLabel(status: string): string {
  return STATUS_PLANO_LABELS[status] || status;
}
