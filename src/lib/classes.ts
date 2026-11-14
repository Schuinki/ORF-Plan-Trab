/**
 * Utilidades compartilhadas para as Classes de Despesa (Classe I a X).
 * Mantém o rótulo de exibição e a ordem militar (I, II, ..., X) em um
 * único lugar, usado pela UI e pela geração de documentos.
 */

export const ORDEM_CLASSES = [
  "CLASSE_I",
  "CLASSE_II",
  "CLASSE_III",
  "CLASSE_IV",
  "CLASSE_V",
  "CLASSE_VI",
  "CLASSE_VII",
  "CLASSE_VIII",
  "CLASSE_IX",
  "CLASSE_X",
] as const;

const ROTULOS: Record<string, string> = {
  CLASSE_I: "CLASSE I",
  CLASSE_II: "CLASSE II",
  CLASSE_III: "CLASSE III",
  CLASSE_IV: "CLASSE IV",
  CLASSE_V: "CLASSE V",
  CLASSE_VI: "CLASSE VI",
  CLASSE_VII: "CLASSE VII",
  CLASSE_VIII: "CLASSE VIII",
  CLASSE_IX: "CLASSE IX",
  CLASSE_X: "CLASSE X",
};

/** "CLASSE_VIII" → "CLASSE VIII" */
export function getClasseNome(classeEnum: string): string {
  return ROTULOS[classeEnum] || classeEnum;
}

/** Índice para ordenação na ordem militar I–X (desconhecidas vão para o fim) */
export function getClasseOrdem(classeEnum: string): number {
  const idx = ORDEM_CLASSES.indexOf(
    classeEnum as (typeof ORDEM_CLASSES)[number]
  );
  return idx === -1 ? ORDEM_CLASSES.length : idx;
}

/** Ordena um array de objetos com campo `nome` (enum da classe) na ordem I–X */
export function ordenarClasses<T extends { nome: string }>(classes: T[]): T[] {
  return [...classes].sort(
    (a, b) => getClasseOrdem(a.nome) - getClasseOrdem(b.nome)
  );
}
