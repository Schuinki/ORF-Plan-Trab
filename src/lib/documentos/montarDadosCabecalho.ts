/**
 * Monta as linhas de texto do cabeçalho oficial (Ministério da
 * Defesa/Exército/Comando + título do documento), reaproveitado tanto
 * pelo PDF quanto pelo Excel — hoje só o PDF tem esse cabeçalho; o Excel
 * começa direto na tabela.
 */
export interface DadosCabecalhoDocumento {
  /** Nome da OM/Comando exibido na 3ª linha (ex.: "COMANDO MILITAR DA AMAZÔNIA" ou o nome da OM quando é um documento de uma única OM). */
  omPrincipal: string;
  /** Subtítulo com o nome da operação (ex.: "PLANO DE TRABALHO LOGÍSTICO DE SOLICITAÇÃO DE RECURSOS ORÇAMENTÁRIOS E FINANCEIROS PARA ..."). */
  subtitulo: string;
  /** Título do documento (ex.: "PLANO DE TRABALHO LOGÍSTICO"). */
  titulo: string;
}

export function montarLinhasCabecalho(dados: DadosCabecalhoDocumento): string[] {
  return [
    "MINISTÉRIO DA DEFESA",
    "EXÉRCITO BRASILEIRO",
    dados.omPrincipal.toUpperCase(),
    dados.subtitulo.toUpperCase(),
    dados.titulo.toUpperCase(),
  ];
}
