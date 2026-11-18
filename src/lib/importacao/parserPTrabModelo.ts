import ExcelJS from "exceljs";
import { ORDEM_CLASSES } from "@/lib/classes";

/**
 * Parser do layout do "P Trab Modelo": uma linha por despesa, com uma
 * coluna de OM/UGE, colunas de Natureza de Despesa (valores absolutos) e
 * uma coluna de Detalhamento/Memória de Cálculo. Funciona tanto para um
 * .xlsx exportado pelo próprio sistema (lendo a tabela visível, não a aba
 * oculta de round-trip) quanto, em tese, para uma cópia real do modelo.
 */

export const CODIGOS_ND = [
  "33.90.15",
  "33.90.30",
  "33.90.33",
  "33.90.39",
  "33.90.40",
  "44.90.52",
] as const;

export type ClasseSugerida = (typeof ORDEM_CLASSES)[number];

// Do mais longo pro mais curto só por clareza — a borda \b depois do grupo
// já impede "I" de casar sozinho dentro de "IX", mesmo em outra ordem.
const ROMANOS = [...ORDEM_CLASSES]
  .map((nome) => ({ nome, romano: nome.replace("CLASSE_", "") }))
  .sort((a, b) => b.romano.length - a.romano.length);

const REGEX_CLASSE_EXPLICITA = new RegExp(
  `\\bCL(?:ASSE)?\\.?\\s*[-–—]?\\s*(${ROMANOS.map((r) => r.romano).join("|")})\\b`
);

// Palavras-chave de apoio para quando a linha não traz "Classe <N>" no texto
// (convenção comum em P Trab reais, mas não universal). Cada classe só é
// sugerida aqui se não for ambígua o suficiente para errar na maioria dos casos.
const PALAVRAS_CHAVE: { regex: RegExp; classe: ClasseSugerida }[] = [
  { regex: /\b(QR|QS|RA[ÇC][ÃA]O|SUBSIST[ÊE]NCIA|ALIMENT)/, classe: "CLASSE_I" },
  { regex: /\b(COMBUST[ÍI]VEL|DIESEL|GASOLINA|LUBRIFICANTE)/, classe: "CLASSE_III" },
  { regex: /\b(MUNI[ÇC][ÃA]O|EXPLOSIVO)/, classe: "CLASSE_V" },
  { regex: /\b(FARDAMENTO|EQUIPAMENTO INDIVIDUAL)/, classe: "CLASSE_VI" },
  { regex: /\b(SA[ÚU]DE|M[ÉE]DIC[OA]|HOSPITALAR|MEDICAMENTO)/, classe: "CLASSE_VIII" },
  { regex: /\bMNT\s*VTR\b|MANUTEN[ÇC][ÃA]O DE VIATURA/, classe: "CLASSE_IX" },
];

/**
 * Tenta identificar a Classe de Suprimento (I a X) de uma linha importada a
 * partir do título/memória de cálculo. Prioridade:
 * 1. Prefixo explícito "Classe <N>" ou "Cl <N>" (convenção já usada pelos
 *    próprios P Trab reais do Exército — ex.: "CLASSE III - Óleo Diesel").
 * 2. Palavras-chave de apoio (combustível, munição, QR/QS etc.).
 * 3. CLASSE_X (material não classificado) como padrão seguro.
 */
export function inferirClasseDespesa(
  titulo: string,
  detalhamento: string
): ClasseSugerida {
  const texto = `${titulo} ${detalhamento}`.toUpperCase();

  const explicita = texto.match(REGEX_CLASSE_EXPLICITA);
  if (explicita) {
    const achado = ROMANOS.find((r) => r.romano === explicita[1]);
    if (achado) return achado.nome;
  }

  for (const { regex, classe } of PALAVRAS_CHAVE) {
    if (regex.test(texto)) return classe;
  }

  return "CLASSE_X";
}

// Colunas de ND que só existem em tabelas de Plano Operacional (GND3/GND4)
// — uma tabela Logística (Classe I-X) nunca tem essas colunas, só
// 33.90.30/33.90.39. Usado para não misturar linhas operacionais numa
// importação Logística (e vice-versa) quando o arquivo tem várias abas.
const CODIGOS_SO_OPERACIONAL = ["33.90.15", "33.90.33", "33.90.40", "44.90.52"];

export interface LinhaImportada {
  /** Texto bruto da coluna de OM (para tentar casar com uma participante da operação depois) */
  omTexto: string;
  titulo: string;
  valoresPorNd: Record<string, number>;
  detalhamento: string;
  /** Classe de Suprimento (I-X) sugerida a partir do título/memória — ver inferirClasseDespesa. */
  classeSugerida: ClasseSugerida;
  /**
   * Formato da tabela de onde a linha veio, pelas colunas de ND que a
   * aba/bloco tinha disponíveis — não necessariamente pelo que a linha usa.
   * "LOGISTICO" = só 33.90.30/33.90.39 (classes I-X); "OPERACIONAL" = tem
   * alguma ND exclusiva de Plano Operacional (GND3/GND4).
   */
  formatoPlano: "LOGISTICO" | "OPERACIONAL";
  /** Nome da aba (xlsx) de onde a linha veio — só para avisos/depuração. */
  origemAba: string;
}

export interface ResultadoParse {
  linhas: LinhaImportada[];
  avisos: string[];
}

function normalizarTexto(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "object" && "richText" in (v as object)) {
    // exceljs: célula com texto rico (vários runs)
    return ((v as { richText: { text: string }[] }).richText || [])
      .map((r) => r.text)
      .join("");
  }
  return String(v);
}

/** Converte "1.234,56" (pt-BR) ou número já numérico em number. "-" ou vazio = 0. */
function parseNumeroPtBR(v: unknown): number {
  if (typeof v === "number") return v;
  const texto = normalizarTexto(v).trim();
  if (!texto || texto === "-") return 0;
  const limpo = texto
    .replace(/[^\d,.-]/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".");
  const valor = parseFloat(limpo);
  return Number.isNaN(valor) ? 0 : valor;
}

/** Acha, numa linha de cabeçalho, o índice da coluna cujo texto contém `termo`. */
function acharColuna(
  cabecalho: string[],
  termos: string[]
): number {
  return cabecalho.findIndex((c) =>
    termos.some((termo) => (c || "").toUpperCase().includes(termo))
  );
}

/**
 * Valores de uma linha, como texto normalizado, sempre denso (sem buracos).
 * `row.values` do exceljs é um array esparso quando células nunca foram
 * tocadas — `Array.from` preenche os buracos com `undefined` antes do
 * `.map`, que senão os pularia silenciosamente e quebraria os índices de
 * coluna calculados a partir do cabeçalho.
 */
function valoresLinha(row: ExcelJS.Row): string[] {
  return Array.from(row.values as unknown[]).slice(1).map(normalizarTexto);
}

/**
 * Núcleo do parser, independente de biblioteca/formato de origem: recebe
 * uma aba já normalizada como matriz de strings (uma linha = um array de
 * células já convertidas para texto) e aplica a mesma heurística de
 * detecção de cabeçalho/colunas usada para o .xlsx. Usado tanto pelo
 * caminho exceljs (.xlsx) quanto pelo caminho SheetJS (.xls/.ods).
 */
function processarAba(
  nomeAba: string,
  linhasAba: string[][],
  avisos: string[]
): LinhaImportada[] {
  const linhas: LinhaImportada[] = [];

  // Acha a linha de cabeçalho procurando "DESPESA" numa linha com várias
  // células preenchidas E com textos diferentes entre si. As frases
  // narrativas dos itens 1-5 do modelo oficial (que também contêm a
  // palavra "DESPESA") costumam estar numa única célula mesclada que
  // ocupa a largura toda da tabela — nesse caso todas as colunas lidas
  // voltam com o MESMO texto repetido, o que não acontece na linha real
  // de títulos (cada coluna tem um rótulo diferente: "OM (UGE)",
  // "NATUREZA DE DESPESA", "DETALHAMENTO..."). Modelos reais do Exército
  // têm bem mais linhas de preâmbulo do que o nosso próprio export, por
  // isso a janela de busca é generosa.
  let indiceCabecalho = -1; // 0-based, índice em linhasAba
  let cabecalho: string[] = [];
  for (let i = 0; i < Math.min(40, linhasAba.length); i++) {
    const valores = linhasAba[i] || [];
    const preenchidas = valores.filter((v) => v.trim() !== "");
    const textosDistintos = new Set(preenchidas).size;
    if (
      preenchidas.length >= 3 &&
      textosDistintos >= 2 &&
      valores.some((v) => v.toUpperCase().includes("DESPESA"))
    ) {
      indiceCabecalho = i;
      cabecalho = valores;
      break;
    }
  }

  if (indiceCabecalho === -1) {
    avisos.push(`Aba "${nomeAba}": cabeçalho não reconhecido, pulada.`);
    return linhas;
  }

  const idxTitulo = acharColuna(cabecalho, ["DESPESA"]);
  const idxOm = acharColuna(cabecalho, ["OM "]);
  const idxDetalhamento = acharColuna(cabecalho, [
    "DETALHAMENTO",
    "MEMÓRIA",
    "MEMORIA",
  ]);

  // O modelo oficial do Exército divide o cabeçalho em duas linhas: uma
  // de rótulos ("NATUREZA DE DESPESA (ND)", repetido) e, logo abaixo, uma
  // com os códigos de ND de fato ("33.90.30" etc.). Nosso próprio export
  // põe tudo numa única linha. Por isso os códigos são procurados na
  // linha de cabeçalho e, se não encontrados ali, na linha seguinte —
  // nesse segundo caso essa linha extra também é pulada como dado.
  const cabecalhoSeguinte = linhasAba[indiceCabecalho + 1] || [];
  const idxPorNd: Record<string, number> = {};
  let usouLinhaDeCodigosSeparada = false;
  CODIGOS_ND.forEach((codigo) => {
    let idx = cabecalho.findIndex((c) => c.includes(codigo));
    if (idx === -1) {
      idx = cabecalhoSeguinte.findIndex((c) => c.includes(codigo));
      if (idx !== -1) usouLinhaDeCodigosSeparada = true;
    }
    if (idx !== -1) idxPorNd[codigo] = idx;
  });

  if (idxTitulo === -1) {
    avisos.push(`Aba "${nomeAba}": coluna de despesa não encontrada.`);
    return linhas;
  }

  const formatoPlano: "LOGISTICO" | "OPERACIONAL" = Object.keys(
    idxPorNd
  ).some((codigo) => CODIGOS_SO_OPERACIONAL.includes(codigo))
    ? "OPERACIONAL"
    : "LOGISTICO";

  const primeiraLinhaDados =
    indiceCabecalho + (usouLinhaDeCodigosSeparada ? 2 : 1);

  for (let i = primeiraLinhaDados; i < linhasAba.length; i++) {
    const valores = linhasAba[i] || [];
    const titulo = (valores[idxTitulo] || "").trim();

    if (!titulo) continue; // linha em branco
    if (/^SOMA\b/i.test(titulo)) continue; // linha de subtotal
    if (/^VALOR TOTAL\b/i.test(titulo)) continue; // linha de total (OM ou geral)
    if (titulo.toUpperCase().includes("DESPESA")) {
      // Início de um novo bloco de OM dentro da mesma aba — o modelo
      // oficial repete o cabeçalho (rótulos + códigos de ND) a cada OM
      // responsável. Pula esta linha e, se a seguinte repetir o mesmo
      // padrão (a linha de códigos), pula ela também.
      const proximoTitulo = ((linhasAba[i + 1] || [])[idxTitulo] || "").trim();
      if (proximoTitulo.toUpperCase().includes("DESPESA")) i += 1;
      continue;
    }

    const valoresPorNd: Record<string, number> = {};
    let somaValores = 0;
    Object.entries(idxPorNd).forEach(([codigo, idx]) => {
      const valor = parseNumeroPtBR(valores[idx]);
      if (valor > 0) {
        valoresPorNd[codigo] = valor;
        somaValores += valor;
      }
    });

    if (somaValores === 0) continue; // linha sem valor, ignora

    const detalhamento =
      idxDetalhamento !== -1 ? (valores[idxDetalhamento] || "").trim() : "";

    linhas.push({
      omTexto: idxOm !== -1 ? valores[idxOm] || "" : "",
      titulo,
      valoresPorNd,
      detalhamento,
      classeSugerida: inferirClasseDespesa(titulo, detalhamento),
      formatoPlano,
      origemAba: nomeAba,
    });
  }

  return linhas;
}

export async function parsePTrabXlsx(
  buffer: Buffer | ArrayBuffer
): Promise<ResultadoParse> {
  const workbook = new ExcelJS.Workbook();
  // Duas cópias de @types/node convivem no projeto (via dependências do
  // exceljs), cada uma com um shape de `Buffer` ligeiramente diferente —
  // o cast abaixo é só pra isso, o valor em runtime é um Buffer normal.
  await workbook.xlsx.load(
    Buffer.from(buffer as ArrayBuffer) as unknown as Parameters<
      typeof workbook.xlsx.load
    >[0]
  );

  const linhas: LinhaImportada[] = [];
  const avisos: string[] = [];

  for (const sheet of workbook.worksheets) {
    // Ignora a aba de dados brutos (round-trip) e a de totais — queremos
    // só as abas com a tabela visível.
    if (/dados.*não editar|totais gerais/i.test(sheet.name)) continue;

    const linhasAba: string[][] = [];
    for (let r = 1; r <= sheet.rowCount; r++) {
      linhasAba.push(valoresLinha(sheet.getRow(r)));
    }

    linhas.push(...processarAba(sheet.name, linhasAba, avisos));
  }

  if (linhas.length === 0) {
    avisos.push(
      "Nenhuma linha de despesa foi reconhecida neste arquivo. Confira se ele segue o layout do modelo (colunas de OM, ND e Detalhamento)."
    );
  }

  return { linhas, avisos };
}

/**
 * Parser de .xls (binário antigo OLE2) e .ods (OpenDocument/LibreOffice)
 * via SheetJS — o exceljs só lê .xlsx. Reaproveita a mesma heurística de
 * `processarAba` usada pelo .xlsx; a única diferença é como cada
 * biblioteca extrai a matriz de células de cada aba.
 */
export async function parsePTrabSheetJs(
  buffer: Buffer | ArrayBuffer,
  tipoArquivo: "xls" | "ods"
): Promise<ResultadoParse> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(Buffer.from(buffer as ArrayBuffer), {
    type: "buffer",
    cellText: true,
  });

  const linhas: LinhaImportada[] = [];
  const avisos: string[] = [];

  for (const nomeAba of workbook.SheetNames) {
    if (/dados.*não editar|totais gerais/i.test(nomeAba)) continue;

    const planilha = workbook.Sheets[nomeAba];
    if (!planilha) continue;

    // header: 1 => array de arrays (uma linha = um array de células), na
    // ordem em que aparecem na planilha; defval garante linhas densas
    // (sem "buracos" undefined) mesmo quando uma célula está vazia — a
    // mesma garantia que `valoresLinha` dá para o caminho exceljs.
    const matriz = XLSX.utils.sheet_to_json<unknown[]>(planilha, {
      header: 1,
      defval: "",
      raw: false,
    });
    const linhasAba = matriz.map((linha) =>
      linha.map((celula) => normalizarTexto(celula))
    );

    linhas.push(...processarAba(nomeAba, linhasAba, avisos));
  }

  if (linhas.length === 0) {
    avisos.push(
      `Nenhuma linha de despesa foi reconhecida neste arquivo .${tipoArquivo}. Confira se ele segue o layout do modelo (colunas de OM, ND e Detalhamento).`
    );
  }

  return { linhas, avisos };
}

/**
 * Parser best-effort de PDF: extração de texto corrido (sem estrutura de
 * tabela) seguida de heurística para separar blocos por despesa. Fidelidade
 * inferior ao .xlsx — sempre revisar o resultado após importar.
 */
export async function parsePTrabPdf(buffer: Buffer): Promise<ResultadoParse> {
  const avisos: string[] = [];
  const linhas: LinhaImportada[] = [];

  let texto: string;
  try {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    try {
      const resultado = await parser.getText();
      texto = resultado.text;
    } finally {
      await parser.destroy();
    }
  } catch (error) {
    console.error("Erro ao extrair texto do PDF:", error);
    return {
      linhas: [],
      avisos: ["Não foi possível ler o PDF. Tente exportar em .xlsx."],
    };
  }

  // Remove quebras de página / rodapés repetidos de forma simples
  const linhasTexto = texto
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const ndRegex = new RegExp(
    `(${CODIGOS_ND.map((c) => c.replace(/\./g, "\\.")).join("|")})`,
    "g"
  );

  // Agrupa o texto em blocos: cada vez que aparece um código de ND,
  // considera que fechou uma despesa e abre a próxima a partir da linha
  // seguinte que pareça um título (texto em maiúsculas).
  let blocoAtual: string[] = [];
  let tituloAtual = "";

  const blocos: { titulo: string; texto: string }[] = [];

  for (const linha of linhasTexto) {
    const pareceTitulo =
      linha.length > 3 &&
      linha === linha.toUpperCase() &&
      /[A-ZÀ-Ú]/.test(linha) &&
      !ndRegex.test(linha);
    ndRegex.lastIndex = 0;

    if (pareceTitulo && blocoAtual.length > 0) {
      blocos.push({ titulo: tituloAtual, texto: blocoAtual.join(" ") });
      blocoAtual = [];
      tituloAtual = linha;
    } else if (pareceTitulo && !tituloAtual) {
      tituloAtual = linha;
    } else {
      blocoAtual.push(linha);
    }
  }
  if (tituloAtual && blocoAtual.length > 0) {
    blocos.push({ titulo: tituloAtual, texto: blocoAtual.join(" ") });
  }

  for (const bloco of blocos) {
    const valoresPorNd: Record<string, number> = {};
    let match: RegExpExecArray | null;
    ndRegex.lastIndex = 0;
    while ((match = ndRegex.exec(bloco.texto))) {
      const codigo = match[1];
      // Procura o primeiro valor monetário depois do código de ND
      const resto = bloco.texto.slice(match.index + codigo.length);
      const valorMatch = resto.match(/(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2})/);
      if (valorMatch) {
        valoresPorNd[codigo] = parseNumeroPtBR(valorMatch[1]);
      }
    }

    if (Object.keys(valoresPorNd).length === 0) {
      avisos.push(
        `Trecho "${bloco.titulo.slice(0, 40)}" não teve nenhum valor de ND reconhecido — revise manualmente.`
      );
      continue;
    }

    const detalhamentoPdf = bloco.texto.slice(0, 2000);
    linhas.push({
      omTexto: "",
      titulo: bloco.titulo,
      valoresPorNd,
      detalhamento: detalhamentoPdf,
      classeSugerida: inferirClasseDespesa(bloco.titulo, detalhamentoPdf),
      // Sem estrutura de tabela no PDF — a melhor pista disponível é a ND
      // da própria linha (menos confiável que a análise por aba do xlsx).
      formatoPlano: Object.keys(valoresPorNd).some((codigo) =>
        CODIGOS_SO_OPERACIONAL.includes(codigo)
      )
        ? "OPERACIONAL"
        : "LOGISTICO",
      origemAba: "",
    });
  }

  if (linhas.length === 0) {
    avisos.push(
      "Não foi possível reconhecer nenhuma despesa neste PDF automaticamente. Lance as despesas manualmente ou tente exportar em .xlsx."
    );
  } else {
    avisos.push(
      "Importação de PDF é best-effort: revise cuidadosamente os valores e descrições de cada despesa importada."
    );
  }

  return { linhas, avisos };
}
