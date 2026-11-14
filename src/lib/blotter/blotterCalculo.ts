/**
 * Motor de colunas dinâmicas da Entrada Rápida (blotter).
 *
 * Cada Classe (I–X) expõe um conjunto de "campos" — as colunas da tabela que
 * ela precisa para gerar o MESMO carimbo que o formulário completo de "Nova
 * Despesa" gera. Em vez de reimplementar a matemática/texto de cada Classe
 * aqui, este módulo só monta o objeto de parâmetros esperado por cada
 * `calcularClasseN()` já existente (em `src/lib/calculos/classeN.ts`) e
 * delega o cálculo a essas mesmas funções puras — garantindo carimbo
 * idêntico por construção, sem duplicar a lógica de cada Classe.
 *
 * Limitação deliberada: cada linha da tabela representa UM item por Classe
 * (ex.: uma viatura, um armamento, um kit). Classes cujo formulário real
 * aceita uma LISTA de itens dentro da mesma despesa (II, III, V, VI, VII,
 * VIII, IX) só permitem um item por linha aqui — para combinar vários itens
 * diferentes numa única despesa, use "Nova Despesa".
 */

import { calcularValorOperacao, gerarCarimboCompleto } from "@/lib/calculos/classeI";
import { calcularClasseII, VALORES_MANUTENCAO } from "@/lib/calculos/classeII";
import {
  calcularClasseIII,
  filtrarViaturasPorCombustivel,
  filtrarEquipamentosPorCombustivel,
  getPrecoEstado,
  ESTADOS_BRASIL,
  type TipoCombustivel,
  type SiglaEstado,
  type PrecosCombustivelAPI,
  type ItemClasseIII,
} from "@/lib/calculos/classeIII";
import { calcularClasseIV } from "@/lib/calculos/classeIV";
import { calcularClasseV, ARMAMENTOS, type TipoArmamento } from "@/lib/calculos/classeV";
import { calcularClasseVI, EQUIPAMENTOS as EQUIPAMENTOS_VI, type TipoEquipamento as TipoEquipamentoVI } from "@/lib/calculos/classeVI";
import { calcularClasseVII, EQUIPAMENTOS as EQUIPAMENTOS_VII, type TipoEquipamento as TipoEquipamentoVII } from "@/lib/calculos/classeVII";
import { calcularClasseVIII, KITS_SAUDE, type TipoKit } from "@/lib/calculos/classeVIII";
import { calcularClasseIX, VIATURAS as VIATURAS_IX, GRUPOS_VIATURA, type TipoViatura, type GrupoViatura } from "@/lib/calculos/classeIX";
import { calcularClasseX } from "@/lib/calculos/classeX";
import { VALORES_REFEICAO } from "@/lib/constants";

export type CampoTipo = "select" | "number" | "text";

export interface OpcaoSelect {
  value: string;
  label: string;
}

export interface ContextoBlotter {
  tipoNome: string | null;
  precosCombustivel: PrecosCombustivelAPI | null;
  diasOperacaoPadrao: number;
  efetivoPadrao: number;
}

export interface CampoDef {
  key: string;
  label: string;
  tipo: CampoTipo;
  placeholder?: string;
  opcoes?: (ctx: ContextoBlotter, valores: Record<string, string>) => OpcaoSelect[];
  largura?: number;
  /** Valor inicial sugerido quando a linha passa a usar esta Classe. */
  valorPadrao?: (ctx: ContextoBlotter) => string;
  /** Se false e o campo não se aplica à Classe/estado atual da linha, a célula fica travada/vazia. */
  aplicavel?: (classeNome: string, valores: Record<string, string>) => boolean;
}

// ============================================
// Definição de todas as colunas possíveis
// ============================================

export const TODOS_CAMPOS: CampoDef[] = [
  {
    key: "subtipo",
    label: "Subtipo",
    tipo: "select",
    opcoes: () => [
      { value: "EQUIPAMENTO_INDIVIDUAL", label: "Equipamento Individual" },
      { value: "MATERIAL_BALISTICO", label: "Material Balístico" },
      { value: "ESTACIONAMENTO_ALOJAMENTO", label: "Estacionamento/Alojamento" },
    ],
  },
  {
    key: "itemEspecifico",
    label: "Item Específico",
    tipo: "select",
    opcoes: (ctx, valores) => opcoesItemEspecifico(valores),
  },
  {
    key: "nomeCustomizado",
    label: "Nome (se Outro)",
    tipo: "text",
    aplicavel: (_, valores) => valores.itemEspecifico === "OUTRO",
  },
  {
    key: "grupoCustomizado",
    label: "Grupo (se Outro)",
    tipo: "select",
    opcoes: () =>
      (Object.keys(GRUPOS_VIATURA) as GrupoViatura[]).map((g) => ({
        value: g,
        label: GRUPOS_VIATURA[g],
      })),
    aplicavel: (classeNome, valores) =>
      classeNome === "CLASSE_IX" && valores.itemEspecifico === "OUTRO",
  },
  {
    key: "efetivoOuQuantidade",
    label: "Quantidade/Efetivo",
    tipo: "number",
    valorPadrao: (ctx) => String(ctx.efetivoPadrao || ""),
  },
  {
    key: "kmOuHoras",
    label: "Km/dia (Vtr) ou Horas/dia (Equip)",
    tipo: "number",
  },
  {
    key: "horasPorDia",
    label: "Horas/dia",
    tipo: "number",
  },
  {
    key: "dias",
    label: "Dias",
    tipo: "number",
    valorPadrao: (ctx) => String(ctx.diasOperacaoPadrao || ""),
  },
  {
    key: "numeroRefIntermediarias",
    label: "Ref. Intermediárias",
    tipo: "number",
    valorPadrao: () => "2",
  },
  {
    key: "valorUnitario",
    label: "Valor Unit. (R$)",
    tipo: "number",
  },
  {
    key: "valorAcionamento",
    label: "Valor Acionamento (R$)",
    tipo: "number",
  },
  {
    key: "estado",
    label: "Estado (Preço Combustível)",
    tipo: "select",
    opcoes: () =>
      (Object.keys(ESTADOS_BRASIL) as SiglaEstado[]).map((sigla) => ({
        value: sigla,
        label: ESTADOS_BRASIL[sigla],
      })),
    valorPadrao: () => "br",
  },
  {
    key: "precoCombustivel",
    label: "Preço Combustível (R$/L)",
    tipo: "number",
  },
  {
    key: "descricao",
    label: "Descrição",
    tipo: "text",
  },
];

const CAMPO_POR_KEY: Record<string, CampoDef> = Object.fromEntries(
  TODOS_CAMPOS.map((c) => [c.key, c])
);

// ============================================
// Quais campos cada Classe usa (nesta ordem)
// ============================================

export const CAMPOS_POR_CLASSE: Record<string, string[]> = {
  CLASSE_I: ["efetivoOuQuantidade", "dias", "numeroRefIntermediarias"],
  CLASSE_II: ["subtipo", "itemEspecifico", "efetivoOuQuantidade", "dias", "valorUnitario"],
  CLASSE_III: ["itemEspecifico", "efetivoOuQuantidade", "kmOuHoras", "dias", "estado", "precoCombustivel"],
  CLASSE_IV: ["descricao", "efetivoOuQuantidade", "valorUnitario"],
  CLASSE_V: ["itemEspecifico", "efetivoOuQuantidade", "dias", "valorUnitario"],
  CLASSE_VI: ["itemEspecifico", "nomeCustomizado", "efetivoOuQuantidade", "dias", "horasPorDia", "valorUnitario"],
  CLASSE_VII: ["itemEspecifico", "efetivoOuQuantidade", "dias", "valorUnitario"],
  CLASSE_VIII: ["itemEspecifico", "nomeCustomizado", "efetivoOuQuantidade", "valorUnitario"],
  CLASSE_IX: ["itemEspecifico", "nomeCustomizado", "grupoCustomizado", "efetivoOuQuantidade", "dias", "valorUnitario", "valorAcionamento"],
  CLASSE_X: ["descricao", "efetivoOuQuantidade", "valorUnitario"],
};

/** Ordem canônica de exibição das colunas quando várias Classes estão presentes na tabela. */
export function camposVisiveis(classesPresentes: string[]): CampoDef[] {
  const keys = new Set<string>();
  classesPresentes.forEach((c) => (CAMPOS_POR_CLASSE[c] || []).forEach((k) => keys.add(k)));
  return TODOS_CAMPOS.filter((c) => keys.has(c.key));
}

export function campoAplicavel(
  campoKey: string,
  classeNome: string,
  valores: Record<string, string>
): boolean {
  if (!(CAMPOS_POR_CLASSE[classeNome] || []).includes(campoKey)) return false;
  const campo = CAMPO_POR_KEY[campoKey];
  if (campo?.aplicavel) return campo.aplicavel(classeNome, valores);
  return true;
}

export function valoresPadraoParaClasse(
  classeNome: string,
  ctx: ContextoBlotter
): Record<string, string> {
  const campos = CAMPOS_POR_CLASSE[classeNome] || [];
  const valores: Record<string, string> = {};
  campos.forEach((key) => {
    const campo = CAMPO_POR_KEY[key];
    if (campo?.valorPadrao) valores[key] = campo.valorPadrao(ctx);
  });
  return valores;
}

function opcoesItemEspecifico(valores: Record<string, string>): OpcaoSelect[] {
  // placeholder — resolvido de fato em opcoesItemEspecificoParaClasse, que
  // precisa da Classe e do Tipo (combustível) de contexto.
  return [];
}

export function opcoesItemEspecificoParaClasse(
  classeNome: string,
  ctx: ContextoBlotter,
  valores: Record<string, string>
): OpcaoSelect[] {
  switch (classeNome) {
    case "CLASSE_II": {
      if (valores.subtipo === "MATERIAL_BALISTICO") {
        return [
          { value: "Capacete Balístico", label: `Capacete Balístico (R$ ${VALORES_MANUTENCAO.CAPACETE_DIA.toFixed(2)}/dia)` },
          { value: "Colete Balístico", label: `Colete Balístico (R$ ${VALORES_MANUTENCAO.COLETE_DIA.toFixed(2)}/dia)` },
        ];
      }
      if (valores.subtipo === "ESTACIONAMENTO_ALOJAMENTO") {
        return [
          { value: "Barraca de Campanha", label: `Barraca de Campanha (R$ ${VALORES_MANUTENCAO.BARRACA_CAMPANHA.toFixed(2)}/dia)` },
          { value: "Toldo", label: `Toldo (R$ ${VALORES_MANUTENCAO.TOLDO.toFixed(2)}/dia)` },
          { value: "Barraca Individual", label: `Barraca Individual (R$ ${VALORES_MANUTENCAO.BARRACA_INDIVIDUAL.toFixed(2)}/dia)` },
          { value: "Cama", label: `Cama (R$ ${VALORES_MANUTENCAO.CAMA.toFixed(2)}/dia)` },
          { value: "Armário", label: `Armário (R$ ${VALORES_MANUTENCAO.ARMARIO.toFixed(2)}/dia)` },
          { value: "Beliche", label: `Beliche (R$ ${VALORES_MANUTENCAO.BELICHE.toFixed(2)}/dia)` },
          { value: "Colchão", label: `Colchão (R$ ${VALORES_MANUTENCAO.COLCHAO.toFixed(2)}/dia)` },
        ];
      }
      return [];
    }
    case "CLASSE_III": {
      const tipoCombustivel = derivarTipoCombustivel(ctx.tipoNome);
      const viaturas = filtrarViaturasPorCombustivel(tipoCombustivel).map((v) => ({
        value: `V:${v.exemplo}`,
        label: `${v.exemplo} (${v.nome}) — ${v.consumoKmL} km/L`,
      }));
      const equipamentos = filtrarEquipamentosPorCombustivel(tipoCombustivel).map((e) => ({
        value: `E:${e.nome}`,
        label: `${e.nome} — ${e.consumoLH} L/h`,
      }));
      return [...viaturas, ...equipamentos];
    }
    case "CLASSE_V":
      return (Object.keys(ARMAMENTOS) as TipoArmamento[]).map((tipo) => ({
        value: tipo,
        label: ARMAMENTOS[tipo].nome,
      }));
    case "CLASSE_VI":
      return [
        ...(Object.keys(EQUIPAMENTOS_VI) as Exclude<TipoEquipamentoVI, "OUTRO">[]).map((tipo) => ({
          value: tipo,
          label: EQUIPAMENTOS_VI[tipo].nome,
        })),
        { value: "OUTRO", label: "Outro (customizado)" },
      ];
    case "CLASSE_VII":
      return (Object.keys(EQUIPAMENTOS_VII) as TipoEquipamentoVII[]).map((tipo) => ({
        value: tipo,
        label: EQUIPAMENTOS_VII[tipo].nome,
      }));
    case "CLASSE_VIII":
      return [
        ...(Object.keys(KITS_SAUDE) as Exclude<TipoKit, "OUTRO">[]).map((tipo) => ({
          value: tipo,
          label: KITS_SAUDE[tipo].nome,
        })),
        { value: "OUTRO", label: "Outro (customizado)" },
      ];
    case "CLASSE_IX":
      return [
        ...(Object.keys(VIATURAS_IX) as Exclude<TipoViatura, "OUTRO">[]).map((tipo) => ({
          value: tipo,
          label: `${VIATURAS_IX[tipo].nome} (${GRUPOS_VIATURA[VIATURAS_IX[tipo].grupo]})`,
        })),
        { value: "OUTRO", label: "Outro (customizado)" },
      ];
    default:
      return [];
  }
}

function derivarTipoCombustivel(tipoNome: string | null): TipoCombustivel {
  const nome = (tipoNome || "").toUpperCase();
  if (nome.includes("DIESEL") || nome.includes("OD")) return "OD";
  return "GAS";
}

// ============================================
// Resultado do cálculo de uma linha
// ============================================

export interface ResultadoLinha {
  valorTotal: number;
  valorCombustivel?: number;
  descricao: string;
  /** Objeto real de parâmetros da Classe (mesmo shape usado por "Nova Despesa"), para salvar em `Despesa.parametros` e permitir edição posterior pelo formulário real. */
  parametros: unknown;
}

function numero(valores: Record<string, string>, key: string): number {
  const v = parseFloat((valores[key] || "").replace(",", "."));
  return Number.isNaN(v) ? 0 : v;
}

/**
 * Calcula uma linha do blotter chamando a MESMA função pura usada pelo
 * formulário completo de "Nova Despesa" para a Classe resolvida — garante
 * carimbo idêntico. Lança um Error com mensagem amigável se faltar algo.
 */
export function calcularLinhaBlotter(
  classeNome: string,
  tipoNome: string | null,
  valores: Record<string, string>,
  ctx: {
    unidade?: string;
    nomeOperacao?: string;
    naturezasCodigos: string[];
    precosCombustivel: PrecosCombustivelAPI | null;
  }
): ResultadoLinha {
  const { unidade, nomeOperacao, naturezasCodigos } = ctx;

  switch (classeNome) {
    case "CLASSE_I": {
      const efetivo = numero(valores, "efetivoOuQuantidade");
      const diasOperacao = numero(valores, "dias");
      const numeroRefIntermediarias = numero(valores, "numeroRefIntermediarias");
      const tipoRefeicao = tipoNome === "QS" || tipoNome === "QR" ? tipoNome : null;
      if (!tipoRefeicao) throw new Error("Selecione um item cujo Tipo seja QR ou QS.");
      if (efetivo <= 0 || diasOperacao <= 0) {
        throw new Error("Informe Efetivo e Dias maiores que zero.");
      }
      const valorRefeicao = VALORES_REFEICAO[tipoRefeicao];
      const resultado = calcularValorOperacao({
        efetivo,
        numeroRefIntermediarias,
        tipoRefeicao,
        valorRefeicao,
        diasOperacao,
      });
      const descricao = gerarCarimboCompleto({
        unidade: unidade || "OM não identificada",
        nomeOperacao: nomeOperacao || "operação",
        efetivo,
        resultado,
        tipoRefeicao,
        naturezas: naturezasCodigos,
      });
      return {
        valorTotal: Number(resultado.total.toFixed(2)),
        descricao,
        parametros: { efetivo, diasOperacao, numeroRefIntermediarias, descricao: "" },
      };
    }

    case "CLASSE_II": {
      const subtipo = valores.subtipo;
      const dias = numero(valores, "dias");
      if (dias <= 0) throw new Error("Informe os Dias.");

      let material;
      if (subtipo === "EQUIPAMENTO_INDIVIDUAL") {
        const numeroMilitares = numero(valores, "efetivoOuQuantidade");
        if (numeroMilitares <= 0) throw new Error("Informe a Quantidade/Efetivo.");
        material = { tipo: "EQUIPAMENTO_INDIVIDUAL" as const, numeroMilitares, periodoDias: dias };
      } else if (subtipo === "MATERIAL_BALISTICO") {
        const item = valores.itemEspecifico;
        const quantidade = numero(valores, "efetivoOuQuantidade");
        if (!item) throw new Error("Selecione o Item Específico.");
        if (quantidade <= 0) throw new Error("Informe a Quantidade/Efetivo.");
        const mntDia = item === "Capacete Balístico" ? VALORES_MANUTENCAO.CAPACETE_DIA : VALORES_MANUTENCAO.COLETE_DIA;
        material = {
          tipo: "MATERIAL_BALISTICO" as const,
          itens: [{ tipo: item, quantidade, mntDia, periodoDias: dias }],
        };
      } else if (subtipo === "ESTACIONAMENTO_ALOJAMENTO") {
        const item = valores.itemEspecifico;
        const quantidade = numero(valores, "efetivoOuQuantidade");
        if (!item) throw new Error("Selecione o Item Específico.");
        if (quantidade <= 0) throw new Error("Informe a Quantidade/Efetivo.");
        const valoresPadrao: Record<string, number> = {
          "Barraca de Campanha": VALORES_MANUTENCAO.BARRACA_CAMPANHA,
          Toldo: VALORES_MANUTENCAO.TOLDO,
          "Barraca Individual": VALORES_MANUTENCAO.BARRACA_INDIVIDUAL,
          Cama: VALORES_MANUTENCAO.CAMA,
          Armário: VALORES_MANUTENCAO.ARMARIO,
          Beliche: VALORES_MANUTENCAO.BELICHE,
          Colchão: VALORES_MANUTENCAO.COLCHAO,
        };
        const mntDiaCustomizado = numero(valores, "valorUnitario");
        const mntDia = mntDiaCustomizado > 0 ? mntDiaCustomizado : valoresPadrao[item] || 0;
        material = {
          tipo: "ESTACIONAMENTO_ALOJAMENTO" as const,
          itens: [{ tipo: item, quantidade, mntDia, periodoDias: dias }],
        };
      } else {
        throw new Error("Selecione o Subtipo.");
      }

      const parametros = { materiais: [material] };
      const resultado = calcularClasseII(parametros, unidade, nomeOperacao, naturezasCodigos);
      return { valorTotal: resultado.valorTotal, descricao: resultado.carimbo, parametros };
    }

    case "CLASSE_III": {
      const itemRaw = valores.itemEspecifico;
      if (!itemRaw) throw new Error("Selecione o Item Específico.");
      const quantidade = numero(valores, "efetivoOuQuantidade");
      const kmOuHoras = numero(valores, "kmOuHoras");
      const diasUso = numero(valores, "dias");
      if (quantidade <= 0 || kmOuHoras <= 0 || diasUso <= 0) {
        throw new Error("Informe Quantidade, Km/Horas por dia e Dias maiores que zero.");
      }
      const tipoCombustivel = derivarTipoCombustivel(tipoNome);
      const [prefixo, nomeItem] = itemRaw.split(/:(.+)/);
      let item: ItemClasseIII;
      if (prefixo === "V") {
        const viatura = filtrarViaturasPorCombustivel(tipoCombustivel).find((v) => v.exemplo === nomeItem);
        if (!viatura) throw new Error("Viatura não encontrada para este combustível.");
        item = { tipoItem: "VIATURA", viatura, quantidade, kmMedioDiario: kmOuHoras, diasUso };
      } else {
        const equipamento = filtrarEquipamentosPorCombustivel(tipoCombustivel).find((e) => e.nome === nomeItem);
        if (!equipamento) throw new Error("Equipamento não encontrado para este combustível.");
        item = { tipoItem: "EQUIPAMENTO", equipamento, quantidade, horasMediaDiaria: kmOuHoras, diasUso };
      }
      const estado = (valores.estado || "br") as SiglaEstado;
      const precoCustomizadoDigitado = numero(valores, "precoCombustivel");
      const precoCombustivelCustomizado =
        precoCustomizadoDigitado > 0
          ? precoCustomizadoDigitado
          : getPrecoEstado(tipoCombustivel, estado, ctx.precosCombustivel);
      const parametros = {
        itens: [item],
        tipoCombustivel,
        precoCombustivelCustomizado,
        estadoSelecionado: estado,
        dataColetaPreco: ctx.precosCombustivel?.dataColeta,
      };
      const resultado = calcularClasseIII(parametros, unidade, nomeOperacao, naturezasCodigos);
      return {
        valorTotal: resultado.valorTotal,
        valorCombustivel: resultado.valorCombustivel,
        descricao: resultado.carimbo,
        parametros,
      };
    }

    case "CLASSE_IV": {
      const descricao = valores.descricao;
      const quantidade = numero(valores, "efetivoOuQuantidade");
      const valorUnitario = numero(valores, "valorUnitario");
      if (!descricao) throw new Error("Informe a Descrição.");
      if (quantidade <= 0 || valorUnitario <= 0) {
        throw new Error("Informe Quantidade e Valor Unitário maiores que zero.");
      }
      const parametros = { materiais: [{ descricao, quantidade, valorUnitario }] };
      const resultado = calcularClasseIV(parametros, unidade, nomeOperacao, naturezasCodigos);
      return { valorTotal: resultado.valorTotal, descricao: resultado.carimbo, parametros };
    }

    case "CLASSE_V": {
      const tipoArmamento = valores.itemEspecifico as TipoArmamento;
      const quantidade = numero(valores, "efetivoOuQuantidade");
      const diasUso = numero(valores, "dias");
      const custoCustomizado = numero(valores, "valorUnitario");
      if (!tipoArmamento) throw new Error("Selecione o Item Específico.");
      if (quantidade <= 0 || diasUso <= 0) throw new Error("Informe Quantidade e Dias maiores que zero.");
      const parametros = {
        armamentos: [
          {
            tipoArmamento,
            quantidade,
            diasUso,
            custoMntDiaCustomizado: custoCustomizado > 0 ? custoCustomizado : undefined,
          },
        ],
      };
      const resultado = calcularClasseV(parametros, unidade, nomeOperacao, naturezasCodigos);
      return { valorTotal: resultado.valorTotal, descricao: resultado.detalhamento, parametros };
    }

    case "CLASSE_VI": {
      const itemRaw = valores.itemEspecifico as TipoEquipamentoVI;
      const quantidade = numero(valores, "efetivoOuQuantidade");
      const diasUso = numero(valores, "dias");
      const horasPorDia = numero(valores, "horasPorDia");
      const custoCustomizado = numero(valores, "valorUnitario");
      if (!itemRaw) throw new Error("Selecione o Item Específico.");
      if (itemRaw === "OUTRO" && custoCustomizado <= 0) {
        throw new Error("Para 'Outro', informe o Valor Unit. (custo/hora).");
      }
      if (quantidade <= 0 || diasUso <= 0 || horasPorDia <= 0) {
        throw new Error("Informe Quantidade, Dias e Horas/dia maiores que zero.");
      }
      const parametros = {
        equipamentos: [
          {
            tipoEquipamento: itemRaw,
            nomeCustomizado: itemRaw === "OUTRO" ? valores.nomeCustomizado : undefined,
            quantidade,
            diasUso,
            horasPorDia,
            custoHoraCustomizado: custoCustomizado > 0 ? custoCustomizado : undefined,
          },
        ],
      };
      const resultado = calcularClasseVI(parametros, unidade, nomeOperacao, naturezasCodigos);
      return { valorTotal: resultado.valorTotal, descricao: resultado.carimbo, parametros };
    }

    case "CLASSE_VII": {
      const itemRaw = valores.itemEspecifico as TipoEquipamentoVII;
      const quantidade = numero(valores, "efetivoOuQuantidade");
      const diasUso = numero(valores, "dias");
      const custoCustomizado = numero(valores, "valorUnitario");
      if (!itemRaw) throw new Error("Selecione o Item Específico.");
      if (quantidade <= 0 || diasUso <= 0) throw new Error("Informe Quantidade e Dias maiores que zero.");
      const parametros = {
        equipamentos: [
          {
            tipoEquipamento: itemRaw,
            quantidade,
            diasUso,
            custoMntDiaCustomizado: custoCustomizado > 0 ? custoCustomizado : undefined,
          },
        ],
      };
      const resultado = calcularClasseVII(parametros, unidade, nomeOperacao, naturezasCodigos);
      return { valorTotal: resultado.valorTotal, descricao: resultado.detalhamento, parametros };
    }

    case "CLASSE_VIII": {
      const itemRaw = valores.itemEspecifico as TipoKit;
      const quantidade = numero(valores, "efetivoOuQuantidade");
      const custoCustomizado = numero(valores, "valorUnitario");
      if (!itemRaw) throw new Error("Selecione o Item Específico.");
      if (itemRaw === "OUTRO" && custoCustomizado <= 0) {
        throw new Error("Para 'Outro', informe o Valor Unit.");
      }
      if (quantidade <= 0) throw new Error("Informe a Quantidade/Efetivo.");
      const parametros = {
        materiais: [
          {
            tipoKit: itemRaw,
            nomeCustomizado: itemRaw === "OUTRO" ? valores.nomeCustomizado : undefined,
            quantidade,
            custoCustomizado: custoCustomizado > 0 ? custoCustomizado : undefined,
          },
        ],
      };
      const resultado = calcularClasseVIII(parametros, unidade, nomeOperacao, naturezasCodigos);
      return { valorTotal: resultado.valorTotal, descricao: resultado.carimbo, parametros };
    }

    case "CLASSE_IX": {
      const itemRaw = valores.itemEspecifico as TipoViatura;
      const quantidade = numero(valores, "efetivoOuQuantidade");
      const diasUso = numero(valores, "dias");
      const custoCustomizado = numero(valores, "valorUnitario");
      const valorAcionamentoCustomizado = numero(valores, "valorAcionamento");
      if (!itemRaw) throw new Error("Selecione o Item Específico.");
      if (itemRaw === "OUTRO" && custoCustomizado <= 0) {
        throw new Error("Para 'Outro', informe o Valor Unit. (custo de manutenção/dia).");
      }
      if (quantidade <= 0 || diasUso <= 0) throw new Error("Informe Quantidade e Dias maiores que zero.");
      const parametros = {
        viaturas: [
          {
            tipoViatura: itemRaw,
            nomeCustomizado: itemRaw === "OUTRO" ? valores.nomeCustomizado : undefined,
            grupoCustomizado: itemRaw === "OUTRO" ? (valores.grupoCustomizado as GrupoViatura) : undefined,
            quantidade,
            diasUso,
            custoMntDiaCustomizado: custoCustomizado > 0 ? custoCustomizado : undefined,
            valorAcionamentoCustomizado: valorAcionamentoCustomizado > 0 ? valorAcionamentoCustomizado : undefined,
          },
        ],
      };
      const resultado = calcularClasseIX(parametros, unidade, nomeOperacao, naturezasCodigos);
      return { valorTotal: resultado.valorTotal, descricao: resultado.detalhamento, parametros };
    }

    case "CLASSE_X": {
      const descricaoDetalhada = valores.descricao;
      const quantidade = numero(valores, "efetivoOuQuantidade");
      const valorUnitario = numero(valores, "valorUnitario");
      if (!descricaoDetalhada) throw new Error("Informe a Descrição.");
      if (quantidade <= 0 || valorUnitario <= 0) {
        throw new Error("Informe Quantidade e Valor Unitário maiores que zero.");
      }
      const parametros = { quantidade, valorUnitario, descricaoDetalhada };
      const resultado = calcularClasseX(parametros, unidade, nomeOperacao, naturezasCodigos);
      return { valorTotal: resultado.valorTotal, descricao: resultado.carimbo, parametros };
    }

    default:
      throw new Error("Classe não suportada na Entrada Rápida.");
  }
}
