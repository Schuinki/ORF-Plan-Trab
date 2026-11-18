/**
 * Catálogo inicial de itens de Munição e Ração, extraído da Diretriz de
 * Prontidão Logística 2026 (Anexo B — Lista nº 3 de munição; nomenclatura
 * oficial "Ração Operacional (R2-A/91)"). Usado só por `prisma/seed.ts` —
 * o admin pode adicionar, editar ou remover itens livremente depois em
 * Configurações > Catálogo de Itens.
 */

export interface CatalogoItemMunicaoSeed {
  neeNsn: string;
  tipo: string;
  ordem: number;
}

export const SEED_CATALOGO_MUNICAO: CatalogoItemMunicaoSeed[] = [
  // Armamento Leve
  { neeNsn: "1305BR1089765", tipo: "Mun 5,56mm", ordem: 1 },
  { neeNsn: "A DEFINIR", tipo: "Mun 7,62mm", ordem: 2 },
  { neeNsn: "A DEFINIR", tipo: "Mun 9mm", ordem: 3 },
  { neeNsn: "A DEFINIR", tipo: "Cal 12 CH3T", ordem: 4 },
  { neeNsn: "A DEFINIR", tipo: "Mun .50 M33", ordem: 5 },
  // Armamento Pesado
  { neeNsn: "A DEFINIR", tipo: "Tir 60mm", ordem: 6 },
  { neeNsn: "A DEFINIR", tipo: "Tir 81mm", ordem: 7 },
  { neeNsn: "A DEFINIR", tipo: "Tir 120mm", ordem: 8 },
  { neeNsn: "A DEFINIR", tipo: "Tir 90 HE-T", ordem: 9 },
  { neeNsn: "A DEFINIR", tipo: "Tir 105mm HEAT", ordem: 10 },
  { neeNsn: "A DEFINIR", tipo: "Tir 105mm AE", ordem: 11 },
  { neeNsn: "A DEFINIR", tipo: "Tir 155mm AE", ordem: 12 },
  // Menos Letal
  {
    neeNsn: "159480",
    tipo: "Car Cal 12 Proj Borracha Precision (AM-403/P)",
    ordem: 13,
  },
  {
    neeNsn: "A DEFINIR",
    tipo: "Car Cal 37/40mm Proj Impacto Expansível (AM-470)",
    ordem: 14,
  },
  { neeNsn: "160115", tipo: "Gr M Outdoor Luz e Som (GL-307)", ordem: 15 },
];

export interface CatalogoItemRacaoSeed {
  item: string;
  ordem: number;
}

export const SEED_CATALOGO_RACAO: CatalogoItemRacaoSeed[] = [
  { item: "Ração Operacional (R2-A/91)", ordem: 1 },
];
