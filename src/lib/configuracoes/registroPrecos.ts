/**
 * Fonte única de verdade para "Configurações > Preços".
 *
 * Mapeia cada classe de despesa logística para os grupos de preço/custo
 * hardcoded em src/lib/calculos/classe*.ts, descrevendo quais itens existem
 * (chave + nome + valores padrão) e quais campos numéricos são editáveis.
 *
 * Usado tanto pela API (para validar chave/grupo/classe antes de persistir um
 * override) quanto pela tela de administração (para renderizar a tabela
 * completa, mesmo para itens sem override salvo).
 *
 * Só importa constantes puras — sem React nem Prisma — então pode ser usado
 * tanto no client quanto no server.
 */

import { ARMAMENTOS } from "../calculos/classeV";
import { EQUIPAMENTOS as EQUIPAMENTOS_VI } from "../calculos/classeVI";
import { EQUIPAMENTOS as EQUIPAMENTOS_VII } from "../calculos/classeVII";
import { KITS_SAUDE } from "../calculos/classeVIII";
import { VIATURAS as VIATURAS_IX } from "../calculos/classeIX";
import { VALORES_MANUTENCAO } from "../calculos/classeII";
import { VALORES_REFEICAO, CONFIG_MAX_DIAS_ETAPA } from "../constants";
import {
  PRECOS_COMBUSTIVEL,
  PRECOS_FALLBACK,
  VIATURAS as VIATURAS_III,
  EQUIPAMENTOS as EQUIPAMENTOS_III,
  CONFIG_FATOR_SEGURANCA_CLASSE_III,
} from "../calculos/classeIII";
import { CONFIG_FATOR_SEGURANCA as CONFIG_FATOR_SEGURANCA_VI } from "../calculos/classeVI";

export interface CampoPrecoEditavel {
  campo: string;
  label: string;
  sufixo?: string;
}

export interface ItemRegistroPreco {
  chave: string;
  nome: string;
  valoresPadrao: Record<string, number>;
}

export interface GrupoRegistroPreco {
  classe: string; // valor do enum ClasseDespesa, ex. "CLASSE_V"
  grupo: string;
  label: string;
  campos: CampoPrecoEditavel[];
  itens: ItemRegistroPreco[];
}

const LABELS_MANUTENCAO_II: Record<string, string> = {
  EQUIPAMENTO_INDIVIDUAL_DIA: "Equipamento Individual (por militar/dia)",
  CAPACETE_DIA: "Capacete (R$/dia)",
  COLETE_DIA: "Colete (R$/dia)",
  BALISTICO_TOTAL_DIA: "Material Balístico Total (R$/dia)",
  BARRACA_CAMPANHA: "Barraca de Campanha",
  TOLDO: "Toldo",
  BARRACA_INDIVIDUAL: "Barraca Individual",
  CAMA: "Cama",
  ARMARIO: "Armário",
  BELICHE: "Beliche",
  COLCHAO: "Colchão",
};

const LABELS_COMBUSTIVEL_NACIONAL: Record<string, string> = {
  GC: "Gasolina Comum (média nacional)",
  OD: "Óleo Diesel (média nacional)",
  GAS: "Gasolina (genérico, média nacional)",
};

const NOME_ESTADO_FALLBACK: Record<string, string> = {
  br: "Brasil (média nacional)",
  ac: "Acre",
  al: "Alagoas",
  am: "Amazonas",
  ap: "Amapá",
  ba: "Bahia",
  ce: "Ceará",
  df: "Distrito Federal",
  es: "Espírito Santo",
  go: "Goiás",
  ma: "Maranhão",
  mg: "Minas Gerais",
  ms: "Mato Grosso do Sul",
  mt: "Mato Grosso",
  pa: "Pará",
  pb: "Paraíba",
  pe: "Pernambuco",
  pi: "Piauí",
  pr: "Paraná",
  rj: "Rio de Janeiro",
  rn: "Rio Grande do Norte",
  ro: "Rondônia",
  rr: "Roraima",
  rs: "Rio Grande do Sul",
  sc: "Santa Catarina",
  se: "Sergipe",
  sp: "São Paulo",
  to: "Tocantins",
};

const NOME_TIPO_COMBUSTIVEL: Record<string, string> = {
  GAS: "Gasolina",
  OD: "Óleo Diesel",
};

function montarItensFallbackCombustivel(): ItemRegistroPreco[] {
  const itens: ItemRegistroPreco[] = [];
  for (const tipo of Object.keys(PRECOS_FALLBACK) as Array<
    keyof typeof PRECOS_FALLBACK
  >) {
    const porEstado = PRECOS_FALLBACK[tipo];
    for (const [estado, valor] of Object.entries(porEstado)) {
      if (valor === undefined) continue;
      itens.push({
        chave: `${tipo}_${estado.toUpperCase()}`,
        nome: `${NOME_TIPO_COMBUSTIVEL[tipo] ?? tipo} — ${
          NOME_ESTADO_FALLBACK[estado] ?? estado.toUpperCase()
        }`,
        valoresPadrao: { valor },
      });
    }
  }
  return itens;
}

const LABELS_VALOR_REFEICAO: Record<string, string> = {
  QR: "QR — Quota de Ração (por etapa)",
  QS: "QS — Quota Suplementar (por etapa)",
};

export const REGISTRO_PRECOS: GrupoRegistroPreco[] = [
  {
    classe: "CLASSE_I",
    grupo: "VALOR_REFEICAO",
    label: "Valor por Etapa de Ração (QR/QS)",
    campos: [{ campo: "valor", label: "Valor", sufixo: "R$/etapa" }],
    itens: Object.entries(VALORES_REFEICAO).map(([chave, valor]) => ({
      chave,
      nome: LABELS_VALOR_REFEICAO[chave] ?? chave,
      valoresPadrao: { valor },
    })),
  },
  {
    classe: "CLASSE_I",
    grupo: "MAX_DIAS_ETAPA",
    label: "Máximo de Dias de Etapa Completa",
    campos: [{ campo: "valor", label: "Dias", sufixo: "dias" }],
    itens: [
      {
        chave: "MAX_DIAS",
        nome: "Máximo de dias pagos como etapa completa (padrão: 8)",
        valoresPadrao: { valor: CONFIG_MAX_DIAS_ETAPA.valor },
      },
    ],
  },
  {
    classe: "CLASSE_II",
    grupo: "MANUTENCAO_II",
    label: "Manutenção / Equipamento Individual",
    campos: [{ campo: "valor", label: "Valor", sufixo: "R$/dia" }],
    itens: Object.entries(VALORES_MANUTENCAO).map(([chave, valor]) => ({
      chave,
      nome: LABELS_MANUTENCAO_II[chave] ?? chave,
      valoresPadrao: { valor },
    })),
  },
  {
    classe: "CLASSE_III",
    grupo: "COMBUSTIVEL_MEDIA_NACIONAL",
    label: "Combustível — Média Nacional (último fallback)",
    campos: [{ campo: "valor", label: "Preço", sufixo: "R$/L" }],
    itens: Object.entries(PRECOS_COMBUSTIVEL).map(([chave, valor]) => ({
      chave,
      nome: LABELS_COMBUSTIVEL_NACIONAL[chave] ?? chave,
      valoresPadrao: { valor },
    })),
  },
  {
    classe: "CLASSE_III",
    grupo: "COMBUSTIVEL_FALLBACK_ESTADO",
    label: "Combustível — Fallback por Estado (quando a API está fora do ar)",
    campos: [{ campo: "valor", label: "Preço", sufixo: "R$/L" }],
    itens: montarItensFallbackCombustivel(),
  },
  {
    classe: "CLASSE_III",
    grupo: "COMBUSTIVEL_CONSUMO_VIATURA",
    label: "Combustível — Consumo de Viaturas",
    campos: [{ campo: "consumoKmL", label: "Consumo", sufixo: "km/L" }],
    itens: VIATURAS_III.map((v) => ({
      chave: v.id,
      nome: `${v.nome} (${v.exemplo})`,
      valoresPadrao: { consumoKmL: v.consumoKmL },
    })),
  },
  {
    classe: "CLASSE_III",
    grupo: "COMBUSTIVEL_CONSUMO_EQUIPAMENTO",
    label: "Combustível — Consumo de Equipamentos",
    campos: [{ campo: "consumoLH", label: "Consumo", sufixo: "L/h" }],
    itens: EQUIPAMENTOS_III.map((e) => ({
      chave: e.id,
      nome: e.nome,
      valoresPadrao: { consumoLH: e.consumoLH },
    })),
  },
  {
    classe: "CLASSE_III",
    grupo: "FATOR_SEGURANCA_COMBUSTIVEL_III",
    label: "Fator de Segurança — Combustível",
    campos: [{ campo: "valor", label: "Fator multiplicador", sufixo: "x" }],
    itens: [
      {
        chave: "COMBUSTIVEL",
        nome: "Margem de segurança sobre o consumo calculado (padrão: 1,3 = 30%)",
        valoresPadrao: { valor: CONFIG_FATOR_SEGURANCA_CLASSE_III.valor },
      },
    ],
  },
  {
    classe: "CLASSE_V",
    grupo: "ARMAMENTO_MANUTENCAO",
    label: "Manutenção de Armamento",
    campos: [
      { campo: "valorMEM", label: "Valor MEM (ano ref.)", sufixo: "R$" },
      { campo: "custoMntDiaBase", label: "Custeio-Mnt/Dia Base", sufixo: "R$/dia" },
      { campo: "custoMntDiaOpMil", label: "Cálculo-Mnt/Dia Op Mil", sufixo: "R$/dia" },
    ],
    itens: Object.entries(ARMAMENTOS).map(([chave, info]) => ({
      chave,
      nome: info.nome,
      valoresPadrao: {
        valorMEM: info.valorMEM,
        custoMntDiaBase: info.custoMntDiaBase,
        custoMntDiaOpMil: info.custoMntDiaOpMil,
      },
    })),
  },
  {
    classe: "CLASSE_VI",
    grupo: "EQUIPAMENTO_ENGENHARIA_MANUTENCAO",
    label: "Manutenção de Equipamentos de Engenharia",
    campos: [
      { campo: "pecasInsumos", label: "Peças e Insumos (ND 30)", sufixo: "R$/h" },
      { campo: "svMnt", label: "Serviço de Manutenção (ND 39)", sufixo: "R$/h" },
      { campo: "totalHora", label: "Total por Hora", sufixo: "R$/h" },
    ],
    itens: Object.entries(EQUIPAMENTOS_VI).map(([chave, info]) => ({
      chave,
      nome: info.nome,
      valoresPadrao: {
        pecasInsumos: info.pecasInsumos,
        svMnt: info.svMnt,
        totalHora: info.totalHora,
      },
    })),
  },
  {
    classe: "CLASSE_VI",
    grupo: "FATOR_SEGURANCA_ENGENHARIA_VI",
    label: "Fator de Segurança — Equipamentos de Engenharia",
    campos: [{ campo: "valor", label: "Fator multiplicador", sufixo: "x" }],
    itens: [
      {
        chave: "ENGENHARIA",
        nome: "Margem de segurança sobre o custo de manutenção calculado (padrão: 1,1 = 10%)",
        valoresPadrao: { valor: CONFIG_FATOR_SEGURANCA_VI.valor },
      },
    ],
  },
  {
    classe: "CLASSE_VII",
    grupo: "EQUIPAMENTO_ELETRONICO_MANUTENCAO",
    label: "Manutenção de Equipamentos Eletrônicos",
    campos: [{ campo: "custoMntDia", label: "Custo Mnt/Dia", sufixo: "R$/dia" }],
    itens: Object.entries(EQUIPAMENTOS_VII).map(([chave, info]) => ({
      chave,
      nome: info.nome,
      valoresPadrao: { custoMntDia: info.custoMntDia },
    })),
  },
  {
    classe: "CLASSE_VIII",
    grupo: "KIT_SAUDE",
    label: "Kits de Saúde",
    campos: [{ campo: "custo", label: "Custo", sufixo: "R$" }],
    itens: Object.entries(KITS_SAUDE).map(([chave, info]) => ({
      chave,
      nome: info.nome,
      valoresPadrao: { custo: info.custo },
    })),
  },
  {
    classe: "CLASSE_IX",
    grupo: "VIATURA_MANUTENCAO",
    label: "Manutenção de Viaturas",
    campos: [
      { campo: "custoMntDia", label: "Custo Mnt/Dia", sufixo: "R$/dia" },
      { campo: "valorAcionamento", label: "Valor de Acionamento", sufixo: "R$" },
    ],
    itens: Object.entries(VIATURAS_IX).map(([chave, info]) => ({
      chave,
      nome: info.nome,
      valoresPadrao: {
        custoMntDia: info.custoMntDia,
        valorAcionamento: info.valorAcionamento,
      },
    })),
  },
];

export function encontrarGrupoRegistro(
  classe: string,
  grupo: string
): GrupoRegistroPreco | undefined {
  return REGISTRO_PRECOS.find((g) => g.classe === classe && g.grupo === grupo);
}

export function chaveConhecida(classe: string, grupo: string, chave: string): boolean {
  const grupoRegistro = encontrarGrupoRegistro(classe, grupo);
  if (!grupoRegistro) return false;
  return grupoRegistro.itens.some((item) => item.chave === chave);
}
