import { formatarDataCurta } from "@/lib/pdf/formatadores";

/**
 * Monta as linhas de texto do cabeçalho oficial (Ministério da
 * Defesa/Exército/Comando + título do documento + dados da Operação),
 * reaproveitado tanto pelo PDF quanto pelo Excel.
 */
export interface DadosCabecalhoDocumento {
  /** Nome da OM/Comando exibido na 3ª linha (ex.: "COMANDO MILITAR DA AMAZÔNIA" ou o nome da OM quando é um documento de uma única OM). */
  omPrincipal: string;
  /** Subtítulo com o nome da operação (ex.: "PLANO DE TRABALHO LOGÍSTICO DE SOLICITAÇÃO DE RECURSOS ORÇAMENTÁRIOS E FINANCEIROS PARA ..."). */
  subtitulo: string;
  /** Título do documento (ex.: "PLANO DE TRABALHO LOGÍSTICO"). */
  titulo: string;
  /** Linhas opcionais "1. NOME DA OPERAÇÃO/2. PERÍODO/..." — mesmas informações que já aparecem no cabeçalho do PDF, para o Excel não ficar incompleto. */
  dadosOperacao?: {
    nomeOperacao: string;
    periodo: string;
    efetivo: string;
    acoesRealizadas?: string | null;
    despesasOperacionais?: string | null;
  };
}

export function montarLinhasCabecalho(dados: DadosCabecalhoDocumento): string[] {
  const linhas = [
    "MINISTÉRIO DA DEFESA",
    "EXÉRCITO BRASILEIRO",
    dados.omPrincipal.toUpperCase(),
    dados.subtitulo.toUpperCase(),
    dados.titulo.toUpperCase(),
  ];

  const op = dados.dadosOperacao;
  if (op) {
    linhas.push("");
    linhas.push(`1. NOME DA OPERAÇÃO: ${op.nomeOperacao.toUpperCase()}`);
    linhas.push(`2. PERÍODO: ${op.periodo}`);
    linhas.push(`3. EFETIVO EMPREGADO: ${op.efetivo}`);
    if (op.acoesRealizadas) {
      linhas.push(`4. AÇÕES REALIZADAS OU A REALIZAR: ${op.acoesRealizadas}`);
    }
    if (op.despesasOperacionais) {
      linhas.push(
        `5. DESPESAS OPERACIONAIS REALIZADAS OU A REALIZAR: ${op.despesasOperacionais}`
      );
    }
  }

  return linhas;
}

export interface OperacaoParaCabecalho {
  nome: string;
  dataInicio: Date | string;
  dataFinal: Date | string;
  efetivoMil: number;
  efetivoExt?: number | null;
  finalidade?: string | null;
  motivacao?: string | null;
}

/** Monta o bloco `dadosOperacao` a partir da Operação — mesma lógica usada no cabeçalho do PDF (período, efetivo, ações/despesas realizadas). */
export function montarDadosOperacaoCabecalho(
  operacao: OperacaoParaCabecalho,
  opcoes?: { acoesRealizadas?: string; despesasOperacionais?: string }
): DadosCabecalhoDocumento["dadosOperacao"] {
  const dataInicio = new Date(operacao.dataInicio);
  const dataFinal = new Date(operacao.dataFinal);
  const efetivoExt = operacao.efetivoExt || 0;

  return {
    nomeOperacao: operacao.nome,
    periodo: `${formatarDataCurta(dataInicio)} A ${formatarDataCurta(dataFinal)}`,
    efetivo:
      efetivoExt > 0
        ? `${operacao.efetivoMil} militares do EB + ${efetivoExt} agentes externos`
        : `${operacao.efetivoMil} militares do EB`,
    acoesRealizadas: opcoes?.acoesRealizadas || operacao.finalidade,
    despesasOperacionais: opcoes?.despesasOperacionais || operacao.motivacao,
  };
}
