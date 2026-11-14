/**
 * Script de geração de dados ricos de demonstração.
 * Roda contra a API HTTP do servidor já em execução (não mexe direto no
 * banco) para reaproveitar toda a lógica de validação/permissão real.
 *
 * Uso: DATABASE_URL não é necessário aqui (tudo via fetch HTTP).
 *   npx tsx prisma/seed-demo.ts
 */

const BASE_URL = "http://localhost:3000";
let cookie = "";

async function api(method: string, path: string, body?: unknown) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    console.error(`  ✗ ${method} ${path} -> ${res.status}:`, data.error || data);
    return null;
  }
  return data;
}

async function login(email: string, password: string) {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ email, password }),
  });
  const setCookie = res.headers.get("set-cookie");
  if (setCookie) cookie = setCookie.split(";")[0];
  if (!res.ok) throw new Error(`Login falhou: ${res.status}`);
  console.log(`✓ Login como ${email}`);
}

interface OM {
  id: string;
  sigla: string;
  nome: string;
  codUG: string;
}
interface Natureza {
  id: string;
  codigo: string;
}
interface Classe {
  id: string;
  nome: string;
}

let oms: Record<string, OM> = {};
let naturezas: Record<string, Natureza> = {};
let classes: Record<string, Classe> = {};

async function carregarReferencias() {
  const omsRaw = await api("GET", "/api/organizacoes/elegiveis-participantes");
  for (const om of omsRaw) oms[om.sigla] = om;

  const natRaw = await api("GET", "/api/naturezas");
  for (const n of natRaw) naturezas[n.codigo] = n;

  const classesRaw = await api("GET", "/api/classes");
  for (const c of classesRaw) classes[c.nome] = c;

  console.log(
    `✓ Referências carregadas: ${Object.keys(oms).length} OMs, ${
      Object.keys(naturezas).length
    } naturezas, ${Object.keys(classes).length} classes`
  );
}

async function criarOperacao(data: {
  nome: string;
  efetivoMil: number;
  efetivoExt?: number;
  dataInicio: string;
  dataFinal: string;
  finalidade: string;
  motivacao: string;
  consequenciaNaoAtendimento?: string;
  valorLimiteTotal: number;
  participantes: { sigla: string; valorLimite: number }[];
}) {
  const omsParticipantes = data.participantes.map((p) => ({
    omId: oms[p.sigla].id,
    valorLimite: p.valorLimite,
  }));

  const operacao = await api("POST", "/api/operacoes", {
    nome: data.nome,
    efetivoMil: data.efetivoMil,
    efetivoExt: data.efetivoExt,
    dataInicio: data.dataInicio,
    dataFinal: data.dataFinal,
    finalidade: data.finalidade,
    motivacao: data.motivacao,
    consequenciaNaoAtendimento: data.consequenciaNaoAtendimento,
    valorLimiteTotal: data.valorLimiteTotal,
    omsParticipantes,
  });
  if (!operacao) throw new Error(`Falha ao criar operação ${data.nome}`);
  console.log(`✓ Operação criada: ${data.nome} (${operacao.id})`);
  return operacao.id as string;
}

async function criarPlano(
  operacaoId: string,
  titulo: string,
  tipo: string,
  omSigla: string
) {
  const plano = await api("POST", "/api/planos", {
    operacaoId,
    titulo,
    tipo,
    omId: oms[omSigla].id,
  });
  if (!plano) throw new Error(`Falha ao criar plano ${titulo}`);
  console.log(`  ✓ Plano criado: ${titulo} [${tipo}] (${plano.id})`);
  return plano.id as string;
}

async function criarDespesaLogistica(
  planoId: string,
  opts: {
    classeNome: string;
    descricao: string;
    valorTotal: number;
    naturezaCodigos: string[]; // rateio igual entre elas
    omRateio: { sigla: string; percentual: number }[];
    valorCombustivel?: number;
  }
) {
  const percNatureza = Number((100 / opts.naturezaCodigos.length).toFixed(2));
  const naturezasArr = opts.naturezaCodigos.map((codigo, i) => ({
    naturezaId: naturezas[codigo].id,
    percentual:
      i === opts.naturezaCodigos.length - 1
        ? Number((100 - percNatureza * (opts.naturezaCodigos.length - 1)).toFixed(2))
        : percNatureza,
  }));

  const result = await api("POST", `/api/planos/${planoId}/despesas`, {
    classeId: classes[opts.classeNome].id,
    valorTotal: opts.valorTotal,
    valorCombustivel: opts.valorCombustivel,
    descricao: opts.descricao,
    naturezas: naturezasArr,
    parametros: { origem: "seed-demo" },
    oms: opts.omRateio.map((o) => ({
      omDestinoId: oms[o.sigla].id,
      omCompradoraId: oms[o.sigla].id,
      percentual: o.percentual,
    })),
  });
  if (result) console.log(`    · despesa logística: ${opts.descricao.slice(0, 60)}...`);
  return result;
}

async function criarDespesaOperacional(
  planoId: string,
  opts: {
    omSigla: string;
    titulo: string;
    objeto?: string;
    objetivo?: string;
    finalidade?: string;
    memoriaCalculo: string;
    pregaoUasg?: string;
    situacaoPregao?: string;
    observacaoPregao?: string;
    naturezas: { codigo: string; valor: number }[];
  }
) {
  const result = await api(
    "POST",
    `/api/planos/${planoId}/despesas-operacionais`,
    {
      omDestinoId: oms[opts.omSigla].id,
      omCompradoraId: oms[opts.omSigla].id,
      titulo: opts.titulo,
      objeto: opts.objeto,
      objetivo: opts.objetivo,
      finalidade: opts.finalidade,
      memoriaCalculo: opts.memoriaCalculo,
      pregaoUasg: opts.pregaoUasg,
      situacaoPregao: opts.situacaoPregao,
      observacaoPregao: opts.observacaoPregao,
      naturezas: opts.naturezas.map((n) => ({
        naturezaId: naturezas[n.codigo].id,
        valor: n.valor,
      })),
    }
  );
  if (result) console.log(`    · despesa operacional: ${opts.titulo}`);
  return result;
}

async function enviarAnalise(planoId: string) {
  const r = await api("POST", `/api/planos/${planoId}/enviar-analise`, {});
  if (r) console.log(`    · enviado para análise`);
  return r;
}

async function aprovarTotalmente(planoId: string) {
  for (let i = 0; i < 5; i++) {
    const r = await api("POST", `/api/planos/${planoId}/aprovar`, {
      acao: "APROVADO",
    });
    if (!r) return;
    console.log(`    · aprovado nível`);
    const plano = await api("GET", `/api/planos/${planoId}`);
    if (plano?.status === "APROVADO") {
      console.log(`    · plano totalmente aprovado`);
      return;
    }
  }
}

async function devolver(planoId: string, motivo: string) {
  const r = await api("POST", `/api/planos/${planoId}/aprovar`, {
    acao: "REPROVADO",
    motivo,
  });
  if (r) console.log(`    · devolvido para correção: ${motivo}`);
  return r;
}

async function main() {
  await login("admin@eb.mil.br", "admin123");
  await carregarReferencias();

  // ========================================================================
  // 1) Enriquecer "Operação Demonstração CATRIMANI III" já existente
  // ========================================================================
  const operacoesExistentes = await api("GET", "/api/operacoes");
  const catrimani = operacoesExistentes.find((o: any) =>
    o.nome.includes("CATRIMANI III")
  );
  if (catrimani) {
    console.log(`\n== Enriquecendo ${catrimani.nome} ==`);
    // Segundo plano LOGISTICO da mesma OM (prova de múltiplos planos do mesmo tipo)
    const plano2 = await criarPlano(
      catrimani.id,
      "P Trab LOG 1ª Bda Inf Sl - Reforço Base Kayanaú",
      "LOGISTICO",
      "1ª Bda Inf Sl"
    );
    await criarDespesaLogistica(plano2, {
      classeNome: "CLASSE_IX",
      descricao:
        "Manutenção corretiva de 4 viaturas blindadas de transporte de pessoal (VBTP) empregadas na Base Kayanaú, incluindo troca de pneus especiais e revisão do sistema de arrefecimento.",
      valorTotal: 62340.0,
      naturezaCodigos: ["33.90.30", "33.90.39"],
      omRateio: [{ sigla: "1ª Bda Inf Sl", percentual: 100 }],
    });
    await criarDespesaLogistica(plano2, {
      classeNome: "CLASSE_VI",
      descricao:
        "Aquisição de uniformes de selva, botas de combate e equipamento individual de proteção para substituição do material degradado pelo uso intensivo em ambiente de floresta.",
      valorTotal: 38900.5,
      naturezaCodigos: ["33.90.30"],
      omRateio: [{ sigla: "1ª Bda Inf Sl", percentual: 100 }],
    });
    await enviarAnalise(plano2);

    // Mais despesas no plano Operacional existente, se encontrado
    const planosOp = await api(
      "GET",
      `/api/operacoes/${catrimani.id}/planos`
    );
    const planoOperacionalExistente = planosOp?.planos?.find(
      (p: any) => p.tipo === "OPERACIONAL_GND3"
    );
    if (planoOperacionalExistente) {
      await criarDespesaOperacional(planoOperacionalExistente.id, {
        omSigla: "1ª Bda Inf Sl",
        titulo: "SUPRIMENTO DE FUNDOS",
        objeto:
          "Recursos para cobrir despesas eventuais e inopinadas durante o deslocamento da tropa.",
        memoriaCalculo:
          "Valor fixo estabelecido pela Diretriz de Custeio Logístico do COLOG para operações de até 30 dias.",
        naturezas: [
          { codigo: "33.90.33", valor: 1600 },
          { codigo: "33.90.40", valor: 1600 },
        ],
      });
    }
  }

  // ========================================================================
  // 2) Enriquecer "Operação RICARDO FRANCO" (criada manualmente pelo usuário)
  // ========================================================================
  const ricardoFranco = operacoesExistentes.find((o: any) =>
    o.nome.includes("RICARDO FRANCO")
  );
  if (ricardoFranco) {
    console.log(`\n== Enriquecendo ${ricardoFranco.nome} ==`);

    const planoLog1 = await criarPlano(
      ricardoFranco.id,
      "P Trab LOG 4º CGEO - Operação RICARDO FRANCO",
      "LOGISTICO",
      "4º CGEO"
    );
    await criarDespesaLogistica(planoLog1, {
      classeNome: "CLASSE_I",
      descricao:
        "Aquisição de gêneros alimentícios para subsistência de 40 militares durante 13 dias de operação na faixa de fronteira.",
      valorTotal: 28500.0,
      naturezaCodigos: ["33.90.30"],
      omRateio: [{ sigla: "4º CGEO", percentual: 100 }],
    });
    await enviarAnalise(planoLog1);
    await aprovarTotalmente(planoLog1);

    const planoOp1 = await criarPlano(
      ricardoFranco.id,
      "P Trab Operacional GND3 4º CGEO - Operação RICARDO FRANCO",
      "OPERACIONAL_GND3",
      "4º CGEO"
    );
    await criarDespesaOperacional(planoOp1, {
      omSigla: "4º CGEO",
      titulo: "PASSAGEM AÉREA/RODOVIÁRIA",
      objeto:
        "Aquisição de passagens para deslocamento de equipe técnica de geoinformação até a área de operações.",
      objetivo: "Viabilizar o reconhecimento geodésico da região de fronteira.",
      finalidade:
        "Prover apoio de geoinformação ao planejamento tático da Operação RICARDO FRANCO.",
      memoriaCalculo: "6 militares x R$ 1.450,00 (passagem aérea) = R$ 8.700,00",
      pregaoUasg: "Pregão 12/2025 UASG 160160 (4º CGEO)",
      situacaoPregao: "PARTICIPANTE",
      naturezas: [{ codigo: "33.90.33", valor: 8700 }],
    });

    const planoLog2 = await criarPlano(
      ricardoFranco.id,
      "P Trab LOG 12ª RM - Operação RICARDO FRANCO",
      "LOGISTICO",
      "12ª RM"
    );
    await criarDespesaLogistica(planoLog2, {
      classeNome: "CLASSE_III",
      descricao:
        "Combustível (óleo diesel) para viaturas de transporte de carga e pessoal empregadas na Operação RICARDO FRANCO.",
      valorTotal: 19800.0,
      valorCombustivel: 3200,
      naturezaCodigos: ["33.90.30"],
      omRateio: [{ sigla: "12ª RM", percentual: 100 }],
    });

    // Segundo plano LOGISTICO da MESMA OM (12ª RM) — outra frente de despesa
    const planoLog3 = await criarPlano(
      ricardoFranco.id,
      "P Trab LOG 12ª RM - Suprimento Complementar",
      "LOGISTICO",
      "12ª RM"
    );
    await criarDespesaLogistica(planoLog3, {
      classeNome: "CLASSE_II",
      descricao:
        "Manutenção de barracas, geradores e material de acampamento utilizados no apoio logístico às tropas desdobradas.",
      valorTotal: 11200.0,
      naturezaCodigos: ["33.90.30", "33.90.39"],
      omRateio: [{ sigla: "12ª RM", percentual: 100 }],
    });
    await enviarAnalise(planoLog3);
    await devolver(
      planoLog3,
      "Memória de cálculo incompleta: discriminar quantidade de barracas e geradores atendidos."
    );
  }

  // ========================================================================
  // 3) Novas operações
  // ========================================================================

  // --- Operação ÁGATA 9 ---
  const agata = await criarOperacao({
    nome: "Operação ÁGATA 9",
    efetivoMil: 420,
    efetivoExt: 60,
    dataInicio: "2026-03-10T00:00:00.000Z",
    dataFinal: "2026-03-30T00:00:00.000Z",
    finalidade:
      "Intensificar a presença do Estado na faixa de fronteira, combatendo ilícitos transfronteiriços como contrabando, descaminho e tráfico de drogas.",
    motivacao:
      "Operação conjunta interagências (Exército, Polícia Federal, Receita Federal e órgãos ambientais) na fronteira norte.",
    consequenciaNaoAtendimento:
      "Manutenção de rotas de ilícitos sem fiscalização, com prejuízo à soberania e à segurança da faixa de fronteira.",
    valorLimiteTotal: 1500000,
    participantes: [
      { sigla: "17ª Bda Inf Sl", valorLimite: 900000 },
      { sigla: "1º B Com GE Sl", valorLimite: 300000 },
    ],
  });

  const agataLog = await criarPlano(
    agata,
    "P Trab LOG 17ª Bda Inf Sl - Operação ÁGATA 9",
    "LOGISTICO",
    "17ª Bda Inf Sl"
  );
  await criarDespesaLogistica(agataLog, {
    classeNome: "CLASSE_III",
    descricao:
      "Combustível (gasolina e diesel) para viaturas táticas e embarcações fluviais empregadas no patrulhamento da faixa de fronteira durante os 20 dias de operação.",
    valorTotal: 87400.0,
    valorCombustivel: 14500,
    naturezaCodigos: ["33.90.30"],
    omRateio: [{ sigla: "17ª Bda Inf Sl", percentual: 100 }],
  });
  await criarDespesaLogistica(agataLog, {
    classeNome: "CLASSE_I",
    descricao:
      "Ração operacional R2 para 420 militares do Exército durante 20 dias de emprego na faixa de fronteira.",
    valorTotal: 156800.0,
    naturezaCodigos: ["33.90.30"],
    omRateio: [
      { sigla: "17ª Bda Inf Sl", percentual: 70 },
      { sigla: "1º B Com GE Sl", percentual: 30 },
    ],
  });
  await enviarAnalise(agataLog);

  const agataOp = await criarPlano(
    agata,
    "P Trab Operacional GND3/GND4 17ª Bda Inf Sl - Operação ÁGATA 9",
    "OPERACIONAL_GND3",
    "17ª Bda Inf Sl"
  );
  await criarDespesaOperacional(agataOp, {
    omSigla: "17ª Bda Inf Sl",
    titulo: "DIÁRIA",
    objeto:
      "Pagamento de diárias aos militares em comitivas de coordenação com órgãos interagências na área de operação.",
    objetivo: "Indenizar despesas de pousada, alimentação e locomoção urbana.",
    finalidade:
      "Assegurar a coordenação entre o Exército e os demais órgãos participantes da Operação ÁGATA 9.",
    memoriaCalculo:
      "04 Of Sup x 4,5 diárias em Tabatinga/AM (4 x 450,00 x 4,5) = R$ 8.100,00",
    pregaoUasg: "",
    naturezas: [{ codigo: "33.90.15", valor: 8100 }],
  });
  await criarDespesaOperacional(agataOp, {
    omSigla: "1º B Com GE Sl",
    titulo: "AQUISIÇÃO DE EQUIPAMENTO DE COMUNICAÇÕES",
    objeto:
      "Aquisição de rádios táticos portáteis para integração das equipes de patrulhamento na faixa de fronteira.",
    finalidade:
      "Garantir o Comando e Controle (C2) entre as frações desdobradas em áreas de selva sem cobertura de telefonia convencional.",
    memoriaCalculo: "15 rádios táteis x R$ 3.200,00 = R$ 48.000,00",
    pregaoUasg: "Pregão 90014/2025 UASG 160155 (1º B Com GE Sl)",
    situacaoPregao: "PARTICIPANTE",
    naturezas: [{ codigo: "44.90.52", valor: 48000 }],
  });

  // --- Operação CURARE ---
  const curare = await criarOperacao({
    nome: "Operação CURARE",
    efetivoMil: 180,
    efetivoExt: 25,
    dataInicio: "2026-04-05T00:00:00.000Z",
    dataFinal: "2026-04-25T00:00:00.000Z",
    finalidade:
      "Levar assistência médica, odontológica e veterinária a comunidades ribeirinhas e indígenas isoladas na calha do rio.",
    motivacao:
      "Ação cívico-social de caráter humanitário em áreas de difícil acesso, em apoio às políticas públicas de saúde.",
    valorLimiteTotal: 600000,
    participantes: [
      { sigla: "2ª Bda Inf Sl", valorLimite: 350000 },
      { sigla: "2º Gpt E", valorLimite: 150000 },
    ],
  });

  const curareLog = await criarPlano(
    curare,
    "P Trab LOG 2ª Bda Inf Sl - Operação CURARE",
    "LOGISTICO",
    "2ª Bda Inf Sl"
  );
  await criarDespesaLogistica(curareLog, {
    classeNome: "CLASSE_VIII",
    descricao:
      "Aquisição de medicamentos, material odontológico e insumos veterinários para atendimento às comunidades ribeirinhas visitadas durante a Operação CURARE.",
    valorTotal: 94200.0,
    naturezaCodigos: ["33.90.30"],
    omRateio: [{ sigla: "2ª Bda Inf Sl", percentual: 100 }],
  });
  await criarDespesaLogistica(curareLog, {
    classeNome: "CLASSE_III",
    descricao:
      "Combustível para embarcações fluviais utilizadas no transporte de equipes de saúde entre as comunidades atendidas.",
    valorTotal: 32100.0,
    valorCombustivel: 5200,
    naturezaCodigos: ["33.90.30"],
    omRateio: [{ sigla: "2ª Bda Inf Sl", percentual: 100 }],
  });

  const curareOp = await criarPlano(
    curare,
    "P Trab Operacional GND3/GND4 2º Gpt E - Operação CURARE",
    "OPERACIONAL_GND3",
    "2º Gpt E"
  );
  await criarDespesaOperacional(curareOp, {
    omSigla: "2º Gpt E",
    titulo: "SERVIÇO DE TERCEIROS (FRETAMENTO)",
    objeto:
      "Fretamento de embarcação regional tipo recreio para transporte de equipamento médico pesado.",
    finalidade:
      "Garantir o transporte seguro de equipamentos de raio-X portátil e gerador para as comunidades sem acesso rodoviário.",
    memoriaCalculo:
      "1 embarcação x 15 dias x R$ 1.800,00/dia = R$ 27.000,00",
    pregaoUasg: "",
    observacaoPregao: "Dispensa de licitação por inexistência de outro prestador na região",
    situacaoPregao: "DISPENSA",
    naturezas: [{ codigo: "33.90.33", valor: 27000 }],
  });

  // --- Operação ACOLHIDA ---
  const acolhida = await criarOperacao({
    nome: "Operação ACOLHIDA",
    efetivoMil: 310,
    efetivoExt: 95,
    dataInicio: "2026-01-15T00:00:00.000Z",
    dataFinal: "2026-12-15T00:00:00.000Z",
    finalidade:
      "Prover apoio logístico e de interiorização a imigrantes e refugiados em situação de vulnerabilidade na fronteira norte.",
    motivacao:
      "Operação humanitária de caráter permanente, em articulação com o Comitê Federal de Assistência Emergencial.",
    valorLimiteTotal: 2400000,
    participantes: [
      { sigla: "16ª Bda Inf Sl", valorLimite: 1400000 },
      { sigla: "12ª RM", valorLimite: 500000 },
    ],
  });

  const acolhidaLog = await criarPlano(
    acolhida,
    "P Trab LOG 16ª Bda Inf Sl - Operação ACOLHIDA",
    "LOGISTICO",
    "16ª Bda Inf Sl"
  );
  await criarDespesaLogistica(acolhidaLog, {
    classeNome: "CLASSE_I",
    descricao:
      "Fornecimento de alimentação para abrigos de interiorização, atendendo em média 1.200 pessoas/dia durante o mês de referência.",
    valorTotal: 310500.0,
    naturezaCodigos: ["33.90.30"],
    omRateio: [{ sigla: "16ª Bda Inf Sl", percentual: 100 }],
  });
  await criarDespesaLogistica(acolhidaLog, {
    classeNome: "CLASSE_IV",
    descricao:
      "Material de construção para ampliação e manutenção de módulos habitacionais nos abrigos de interiorização.",
    valorTotal: 68700.0,
    naturezaCodigos: ["33.90.30", "33.90.39"],
    omRateio: [{ sigla: "16ª Bda Inf Sl", percentual: 100 }],
  });
  await enviarAnalise(acolhidaLog);
  await aprovarTotalmente(acolhidaLog);

  // Segundo plano LOGISTICO da MESMA OM (16ª Bda Inf Sl) — mês seguinte
  const acolhidaLog2 = await criarPlano(
    acolhida,
    "P Trab LOG 16ª Bda Inf Sl - Reforço de Abrigos (2º ciclo)",
    "LOGISTICO",
    "16ª Bda Inf Sl"
  );
  await criarDespesaLogistica(acolhidaLog2, {
    classeNome: "CLASSE_I",
    descricao:
      "Complementação de alimentação para abrigos de interiorização em razão do aumento do fluxo migratório no período.",
    valorTotal: 142300.0,
    naturezaCodigos: ["33.90.30"],
    omRateio: [{ sigla: "16ª Bda Inf Sl", percentual: 100 }],
  });

  const acolhidaOp = await criarPlano(
    acolhida,
    "P Trab Operacional GND3/GND4 12ª RM - Operação ACOLHIDA",
    "OPERACIONAL_GND3",
    "12ª RM"
  );
  await criarDespesaOperacional(acolhidaOp, {
    omSigla: "12ª RM",
    titulo: "AQUISIÇÃO DE EQUIPAMENTO DE COMUNICAÇÕES",
    objeto: "Aquisição de licenças de software de gestão de abrigos e cadastro de assistidos.",
    finalidade:
      "Informatizar o controle de entrada, triagem e acompanhamento de imigrantes atendidos pela Operação ACOLHIDA.",
    memoriaCalculo: "25 licenças x R$ 180,00/mês x 12 meses = R$ 54.000,00",
    pregaoUasg: "PE 90003/2025 UASG 070.024 (Gab Cmt Ex) - ADESÃO (CARONA AUTORIZADA)",
    situacaoPregao: "ADESAO_CARONA",
    naturezas: [{ codigo: "44.90.52", valor: 54000 }],
  });

  // --- Operação VERDE BRASIL 2 ---
  const verdeBrasil = await criarOperacao({
    nome: "Operação VERDE BRASIL 2",
    efetivoMil: 260,
    efetivoExt: 40,
    dataInicio: "2026-08-01T00:00:00.000Z",
    dataFinal: "2026-08-31T00:00:00.000Z",
    finalidade:
      "Combater o desmatamento ilegal, garimpo irregular e incêndios criminosos na Amazônia Legal.",
    motivacao:
      "Reforço interagências (Exército, IBAMA, ICMBio, Polícia Federal) em período crítico de queimadas.",
    consequenciaNaoAtendimento:
      "Avanço do desmatamento e garimpo ilegal sem resposta coordenada do Estado, com danos ambientais irreversíveis.",
    valorLimiteTotal: 1100000,
    participantes: [
      { sigla: "4º BAvEx", valorLimite: 650000 },
      { sigla: "4º CGEO", valorLimite: 300000 },
    ],
  });

  const verdeBrasilLog = await criarPlano(
    verdeBrasil,
    "P Trab LOG 4º BAvEx - Operação VERDE BRASIL 2",
    "LOGISTICO",
    "4º BAvEx"
  );
  await criarDespesaLogistica(verdeBrasilLog, {
    classeNome: "CLASSE_III",
    descricao:
      "Combustível de aviação (QAV-1) para helicópteros empregados no sensoriamento remoto e combate a incêndios florestais.",
    valorTotal: 218000.0,
    valorCombustivel: 18500,
    naturezaCodigos: ["33.90.30"],
    omRateio: [{ sigla: "4º BAvEx", percentual: 100 }],
  });

  const verdeBrasilOp = await criarPlano(
    verdeBrasil,
    "P Trab Operacional GND3/GND4 4º BAvEx - Operação VERDE BRASIL 2",
    "OPERACIONAL_GND3",
    "4º BAvEx"
  );
  await criarDespesaOperacional(verdeBrasilOp, {
    omSigla: "4º BAvEx",
    titulo: "SERVIÇO DE TERCEIROS (MANUTENÇÃO)",
    objeto:
      "Manutenção preventiva emergencial de aeronave de asa rotativa empregada no sensoriamento de focos de incêndio.",
    finalidade:
      "Garantir a disponibilidade operacional da aeronave para as missões de combate a incêndios florestais.",
    memoriaCalculo: "1 revisão de 100h x R$ 72.000,00",
    pregaoUasg: "Pregão 04/2026 UASG 160153 (4º BAvEx)",
    situacaoPregao: "PARTICIPANTE",
    naturezas: [{ codigo: "33.90.39", valor: 72000 }],
  });
  await criarDespesaOperacional(verdeBrasilOp, {
    omSigla: "4º CGEO",
    titulo: "AQUISIÇÃO DE EQUIPAMENTO DE COMUNICAÇÕES",
    objeto:
      "Aquisição de imagens de satélite de alta resolução para identificação de focos de desmatamento e garimpo.",
    finalidade:
      "Subsidiar o planejamento geoespacial das ações de combate ao desmatamento na área de operações.",
    memoriaCalculo: "Pacote de imagens de 5.000 km² x R$ 9,80/km² = R$ 49.000,00",
    pregaoUasg: "",
    situacaoPregao: "INEXIGIBILIDADE",
    observacaoPregao: "Fornecedor exclusivo de imagens de satélite com a resolução exigida",
    naturezas: [{ codigo: "44.90.52", valor: 49000 }],
  });
  await enviarAnalise(verdeBrasilOp);

  console.log("\n✅ Dados de demonstração gerados com sucesso.");
}

main().catch((err) => {
  console.error("Erro no script de demo:", err);
  process.exit(1);
});
