/**
 * Rascunhos (modelos) de Despesa Operacional configuráveis pelo admin em
 * Configurações > Despesa Operacional. Servem de pré-preenchimento ao criar
 * uma despesa operacional num Plano de Trabalho Operacional de GND 3 ou
 * GND 4 — o usuário pode editar livremente depois de aplicado.
 *
 * O conteúdo inicial (ver `SEED_RASCUNHOS_DESPESA_OPERACIONAL`, usado só por
 * `prisma/seed.ts`) foi generalizado a partir de um P Trab Operacional real
 * já aprovado, removendo valores e nomes específicos de uma operação
 * concreta — fica como texto-base para o usuário adaptar, não como valor
 * pronto para uso.
 */

export const GNDS_VALIDOS = ["GND 3", "GND 4"] as const;
export type GndValido = (typeof GNDS_VALIDOS)[number];

export interface RascunhoDespesaOperacionalSeed {
  gnd: GndValido;
  titulo: string;
  objeto: string;
  objetivo: string;
  finalidade: string;
  memoriaCalculo: string;
  ordem: number;
}

export const SEED_RASCUNHOS_DESPESA_OPERACIONAL: RascunhoDespesaOperacionalSeed[] = [
  {
    gnd: "GND 3",
    titulo: "DIÁRIA",
    objeto:
      "Pagamento de diárias aos militares participantes das comitivas/deslocamentos em proveito da [nome da operação].",
    objetivo: "Indenizar as despesas de pousada, alimentação e locomoção urbana.",
    finalidade:
      "Assegurar o exercício do Comando e Controle (C2) e a fiscalização sobre as tropas e atividades da operação.",
    memoriaCalculo:
      "Cálculo de diárias: Nr de Militares do Posto/Grad x Nr de diárias x Valor da diária conforme localidade (Anexo III do Decreto nº 4.307/2002, alterado pelo Decreto nº 12.324/2024).\n\n- [Nr] [Posto/Grad] x [Nr] diárias em [localidade] (+ adicional de deslocamento, se aplicável) = R$ X.XXX,XX\n\nTotal: R$ X.XXX,XX",
    ordem: 1,
  },
  {
    gnd: "GND 3",
    titulo: "PASSAGEM AÉREA/RODOVIÁRIA",
    objeto: "Aquisição de passagem aérea e/ou rodoviária para a área de operações.",
    objetivo:
      "Prover o transporte de militares em proveito da operação (considerar acréscimo percentual para variação de valor até a compra, se aplicável).",
    finalidade:
      "Exercer a fiscalização e o Comando e Controle (C2) sobre as tropas desdobradas na área de operações, viabilizando o rodízio periódico de militares e garantindo a eficiência operacional da missão.",
    memoriaCalculo:
      "Ida e volta [origem] - [destino]: R$ X.XXX,XX\n[Nr] militares x R$ X.XXX,XX = R$ XX.XXX,XX\n\nTotal: R$ XX.XXX,XX\nValor orçado no SCDP em [data].\nPregão [nº/ano] UASG [código] ([OM]) — constar se é participante do pregão ou se está autorizada a adesão.",
    ordem: 2,
  },
  {
    gnd: "GND 3",
    titulo: "SUPRIMENTO DE FUNDOS",
    objeto:
      "Recursos necessários para cobrir despesas eventuais e inopinadas com aquisição de materiais de consumo e de serviços diversos durante a operação.",
    objetivo:
      "Cobrir despesas eventuais, de pequeno vulto ou de caráter urgente que não possam ser atendidas pelo processo normal de empenho.",
    finalidade:
      "Garantir a continuidade do apoio logístico à tropa empregada diante de imprevistos (ex.: reparos emergenciais, reabastecimento em caso de desabastecimento).",
    memoriaCalculo: "Valor Total: R$ X.XXX,XX",
    ordem: 3,
  },
  {
    gnd: "GND 3",
    titulo: "SERVIÇO DE TERCEIROS (LOCAÇÃO DE VEÍCULO)",
    objeto: "Serviço de locação de veículo tipo [especificar] — capacidade: [nr] passageiros.",
    objetivo:
      "Prover transporte terrestre e mobilidade tática às equipes empregadas, possibilitando o deslocamento de pessoal e materiais na Área de Operações.",
    finalidade:
      "Suplementar a frota orgânica, garantindo a flexibilidade e a agilidade necessárias para a execução das missões no contexto da operação.",
    memoriaCalculo:
      "(Nr vtr) x (Nr diárias) x (valor diária) = R$ X.XXX,XX\n\nValor Total: R$ X.XXX,XX\nPregão [nº/ano] UASG [código] ([OM])",
    ordem: 4,
  },
  {
    gnd: "GND 3",
    titulo: "SERVIÇOS DE TERCEIROS (FRETAMENTO DE ÔNIBUS)",
    objeto:
      "Fretamento de veículo rodoviário tipo ônibus (mínimo [nr] lugares) para transporte de tropa no itinerário [origem]/[destino]/[origem].",
    objetivo:
      "Realizar a mobilização e a desmobilização de [nr] militares, incluindo o faturamento de quilometragem percorrida conforme as normas de medição previstas no pregão.",
    finalidade:
      "Garantir o deslocamento tático e seguro do efetivo para a Área de Operações pelo meio mais econômico e eficiente disponível.",
    memoriaCalculo:
      "Distância percorrida (ida/volta, mobilização e desmobilização): [nr] km.\nValor por km rodado: R$ XX,XX/km.\n[nr] km x R$ XX,XX = R$ X.XXX,XX\n\nValor Total: R$ X.XXX,XX\nPregão [nº/ano] UASG [código] ([OM]) — constar se é participante do pregão ou se está autorizada a adesão.",
    ordem: 5,
  },
  {
    gnd: "GND 3",
    titulo: "VERBA OPERACIONAL (VO)",
    objeto: "Verba operacional a fim de custear as operações de inteligência no âmbito da operação, durante [nr] dias.",
    objetivo: "Custear despesas de caráter sigiloso inerentes às atividades de inteligência da operação.",
    finalidade:
      "Assegurar a produção de conhecimento e a segurança orgânica necessárias ao planejamento e à execução das ações no contexto da operação.",
    memoriaCalculo: "Valor Total: R$ X.XXX,XX",
    ordem: 6,
  },
  {
    gnd: "GND 3",
    titulo: "SERVIÇO DE TERCEIROS (MANUTENÇÃO DE AR-CONDICIONADO)",
    objeto:
      "Prestação de serviços de manutenção preventiva e corretiva (higienização e recarga de gás) em aparelhos de ar-condicionado.",
    objetivo:
      "Realizar a limpeza técnica e a recomposição do sistema de refrigeração dos aparelhos, garantindo o suporte térmico necessário às instalações utilizadas pela tropa.",
    finalidade:
      "Assegurar condições adequadas de saúde e habitabilidade nas instalações militares, preservando equipamentos de TI e a recuperação física da tropa.",
    memoriaCalculo:
      "Item [nr] – [descrição do serviço]: [nr] und x R$ XX,XX = R$ X.XXX,XX\n\nTotal: R$ X.XXX,XX\nPregão [nº/ano] – UASG [código] ([OM]) — constar se é participante do pregão ou se está autorizada a adesão.",
    ordem: 7,
  },
  {
    gnd: "GND 3",
    titulo: "SERVIÇOS DE TERCEIROS (TELEFONIA/INTERNET SATELITAL)",
    objeto:
      "Contratação de serviço de telecomunicações móveis e/ou de dados via satélite para a área de operações.",
    objetivo:
      "Prover conectividade de voz e dados em áreas de sombra de cobertura convencional, garantindo a transmissão de mensagens operacionais e o acionamento de emergência (SAR) para o efetivo desdobrado.",
    finalidade:
      "Assegurar o Comando e Controle (C2) e a segurança orgânica da tropa em áreas remotas, onde a ausência de infraestrutura de telecomunicações local exige meios alternativos.",
    memoriaCalculo:
      "(Taxa de ativação + mensalidade/créditos) x Nr de equipamentos = R$ X.XXX,XX\n\nTotal: R$ X.XXX,XX\nPregão [nº/ano] — UG [código] ([OM]) — constar se é participante do pregão ou se está autorizada a adesão.",
    ordem: 8,
  },
  {
    gnd: "GND 3",
    titulo: "SERVIÇO DE TERCEIROS (LICENÇA DE SOFTWARE)",
    objeto: "Contratação de licenças de uso de software de produtividade e colaboração para suporte administrativo e operacional.",
    objetivo:
      "Prover ferramentas digitais para criação e edição de documentos, planilhas logísticas e apresentações táticas para os postos de trabalho da seção envolvida.",
    finalidade:
      "Viabilizar a criação, edição e aprimoramento de documentos e registros operacionais essenciais à execução da operação.",
    memoriaCalculo: "[Nr] licenças x R$ XXX,XX (valor unitário) = Total: R$ X.XXX,XX",
    ordem: 9,
  },
  {
    gnd: "GND 3",
    titulo: "MATERIAL DE CONSUMO (MATERIAL DE EXPEDIENTE)",
    objeto: "Aquisição de materiais de expediente e consumo administrativo para o suporte logístico da operação.",
    objetivo:
      "Prover insumos de escritório e infraestrutura básica para atender o efetivo em salas de situação, alojamentos e centros de planejamento durante o ciclo da operação.",
    finalidade:
      "Garantir a continuidade das atividades de Comando e Controle (C2) e o fluxo documental da operação.",
    memoriaCalculo:
      "MATERIAL — UND — QTD — VALOR UNIT. — VALOR TOTAL\n[listar cada item: quantidade x valor unitário = subtotal]\n\nTOTAL: R$ X.XXX,XX\nPregão [nº/ano] UASG [código] ([OM])",
    ordem: 10,
  },
  {
    gnd: "GND 3",
    titulo: "MATERIAL DE CONSUMO (MATERIAL DE HIGIENE E LIMPEZA)",
    objeto: "Aquisição de materiais de higiene, limpeza e consumo para o apoio logístico à operação.",
    objetivo:
      "Prover insumos sanitários para a manutenção de alojamentos, postos de comando, banheiros e áreas comuns ocupadas pelo efetivo durante a operação.",
    finalidade:
      "Garantir as condições de salubridade e higiene na base de operações, prevenindo a proliferação de doenças infectocontagiosas e assegurando o bem-estar do efetivo empregado.",
    memoriaCalculo:
      "MATERIAL — UND — QTD — VALOR UNIT. — VALOR TOTAL\n[listar cada item: quantidade x valor unitário = subtotal]\n\nTOTAL MENSAL: R$ X.XXX,XX\nPregão [nº/ano] UASG [código] ([OM])",
    ordem: 11,
  },
  {
    gnd: "GND 3",
    titulo: "ALIMENTAÇÃO DE AGENTES",
    objeto:
      "Aquisição de gêneros alimentícios (estocáveis e perecíveis) para a manutenção da subsistência dos agentes/militares empregados na operação.",
    objetivo:
      "Prover suporte logístico de alimentação integral (café, almoço, jantar, ceia e lanche) para o efetivo total envolvido, durante o ciclo operacional.",
    finalidade:
      "Assegurar a higidez física e a manutenção do poder de combate da tropa desdobrada em área de operação remota.",
    memoriaCalculo:
      "Cálculo realizado conforme Diretriz Logística para alimentação de agentes.\n[Nr] pessoas x [Nr] dias x R$ XX,XX (diária) = R$ X.XXX,XX\n\nTOTAL: R$ X.XXX,XX\nPregão [nº/ano] UASG [código] ([OM])",
    ordem: 12,
  },
  {
    gnd: "GND 3",
    titulo: "ENERGIA ELÉTRICA",
    objeto: "Pagamento de excedente tarifário de energia elétrica referente ao consumo adicional gerado pela operação.",
    objetivo: "Custear a energia excedente em virtude do incremento populacional e operacional nas instalações da OM apoiadora.",
    finalidade:
      "Garantir o suporte de infraestrutura básica necessário ao funcionamento ininterrupto do Posto de Comando, alojamentos e centros de comunicações da operação.",
    memoriaCalculo:
      "Saldo mensal de repasse da DGO para custeio de energia elétrica: R$ X.XXX,XX\nValor da conta no período da operação: R$ X.XXX,XX\nExcedente: R$ XXX,XX",
    ordem: 13,
  },
  {
    gnd: "GND 3",
    titulo: "SERVIÇO DE LAVANDERIA",
    objeto: "Contratação de serviço de lavanderia para o fardamento e roupas de cama do efetivo empregado na operação.",
    objetivo: "Prover a higienização periódica de fardamento, roupas de cama e banho da tropa desdobrada.",
    finalidade: "Garantir condições de salubridade e higiene do efetivo empregado durante o ciclo da operação.",
    memoriaCalculo: "[Nr] militares x R$ XX,XX (valor por militar/período) = R$ X.XXX,XX\n\nTotal: R$ X.XXX,XX\nPregão [nº/ano] UASG [código] ([OM])",
    ordem: 14,
  },
  {
    gnd: "GND 3",
    titulo: "SERVIÇO GRÁFICO",
    objeto: "Contratação de serviço gráfico (impressão, encadernação, confecção de crachás/credenciais) em proveito da operação.",
    objetivo: "Prover material impresso necessário à identificação, divulgação e documentação das atividades da operação.",
    finalidade: "Assegurar o suporte administrativo e de identificação do efetivo e das atividades desenvolvidas na operação.",
    memoriaCalculo: "[Nr] itens x R$ XX,XX (valor unitário) = R$ X.XXX,XX\n\nTotal: R$ X.XXX,XX\nPregão [nº/ano] UASG [código] ([OM])",
    ordem: 15,
  },
  {
    gnd: "GND 3",
    titulo: "EQUIPAMENTO DE PROTEÇÃO INDIVIDUAL",
    objeto: "Aquisição de Equipamento de Proteção Individual (EPI) para o efetivo empregado na operação.",
    objetivo: "Prover itens de proteção individual (luvas, óculos, protetores auriculares etc.) não contemplados na dotação orgânica.",
    finalidade: "Garantir a segurança do trabalho e a integridade física do efetivo durante a execução das atividades da operação.",
    memoriaCalculo: "[Nr] militares x R$ XX,XX (kit EPI) = R$ X.XXX,XX\n\nTotal: R$ X.XXX,XX\nPregão [nº/ano] UASG [código] ([OM])",
    ordem: 16,
  },
  {
    gnd: "GND 3",
    titulo: "ÁGUA E ESGOTO",
    objeto: "Pagamento de excedente tarifário de água e esgoto referente ao consumo adicional gerado pela operação.",
    objetivo: "Custear o consumo excedente de água e esgoto em virtude do incremento populacional e operacional nas instalações da OM apoiadora.",
    finalidade: "Garantir o suporte de infraestrutura básica necessário ao funcionamento do Posto de Comando e alojamentos da operação.",
    memoriaCalculo: "Valor da conta no período da operação: R$ X.XXX,XX\nSaldo mensal de referência (sem a operação): R$ X.XXX,XX\nExcedente: R$ XXX,XX",
    ordem: 17,
  },
  {
    gnd: "GND 3",
    titulo: "MATERIAL DE SINALIZAÇÃO",
    objeto: "Aquisição de material de sinalização (placas, fitas zebradas, cones etc.) para a área de operações.",
    objetivo: "Prover a sinalização de áreas restritas, rotas e instalações utilizadas durante a operação.",
    finalidade: "Garantir a segurança e a organização do trânsito de pessoal e viaturas na área da operação.",
    memoriaCalculo: "[Nr] itens x R$ XX,XX (valor unitário) = R$ X.XXX,XX\n\nTotal: R$ X.XXX,XX\nPregão [nº/ano] UASG [código] ([OM])",
    ordem: 18,
  },
  {
    gnd: "GND 3",
    titulo: "PILHAS E BATERIAS",
    objeto: "Aquisição de pilhas e baterias para equipamentos empregados na operação (rádios, lanternas, GPS etc.).",
    objetivo: "Prover o suprimento energético necessário ao funcionamento contínuo dos equipamentos eletrônicos empregados.",
    finalidade: "Garantir a disponibilidade operacional dos equipamentos de comunicação e orientação durante a operação.",
    memoriaCalculo: "[Nr] und x R$ XX,XX (valor unitário) = R$ X.XXX,XX\n\nTotal: R$ X.XXX,XX\nPregão [nº/ano] UASG [código] ([OM])",
    ordem: 19,
  },
  {
    gnd: "GND 4",
    titulo: "AQUISIÇÃO DE EQUIPAMENTO/MATERIAL PERMANENTE",
    objeto: "Aquisição de equipamento/material permanente necessário à execução das tarefas da operação.",
    objetivo: "Prover [especificar o equipamento] para emprego pelas frações envolvidas na operação.",
    finalidade:
      "Garantir a capacidade operacional e a sustentabilidade do apoio logístico durante e após a operação (bem de natureza permanente, natureza de despesa 44.90.52).",
    memoriaCalculo: "[Nr] und x R$ X.XXX,XX (valor unitário) = Total: R$ X.XXX,XX\nPregão [nº/ano] UASG [código] ([OM])",
    ordem: 1,
  },
];
