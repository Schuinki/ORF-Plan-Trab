# -*- coding: utf-8 -*-
"""Gera Documentacao_Tecnica_SisPTrab.pdf — documento técnico para um futuro
desenvolvedor (Eng. Computação) que for dar manutenção ao projeto.
"""
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle,
    ListFlowable, ListItem, HRFlowable, Preformatted, KeepTogether,
)

BASE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(BASE, "Documentacao_Tecnica_SisPTrab.pdf")

NAVY = colors.HexColor("#1f3a5f")
NAVY_LIGHT = colors.HexColor("#eaeff5")
RED = colors.HexColor("#8a2d2d")
RED_LIGHT = colors.HexColor("#fbeaea")
CODE_BG = colors.HexColor("#f4f4f4")

styles = getSampleStyleSheet()
styles.add(ParagraphStyle("CoverTitle", fontSize=28, leading=34, alignment=TA_CENTER,
                           textColor=NAVY, spaceAfter=10, fontName="Helvetica-Bold"))
styles.add(ParagraphStyle("CoverSubtitle", fontSize=14, leading=19, alignment=TA_CENTER,
                           textColor=colors.HexColor("#444444"), spaceAfter=6))
styles.add(ParagraphStyle("H1", fontSize=18, leading=22, spaceBefore=4, spaceAfter=12,
                           textColor=NAVY, fontName="Helvetica-Bold"))
styles.add(ParagraphStyle("H2", fontSize=13, leading=17, spaceBefore=14, spaceAfter=7,
                           textColor=NAVY, fontName="Helvetica-Bold"))
styles.add(ParagraphStyle("H3", fontSize=10.8, leading=14, spaceBefore=10, spaceAfter=5,
                           textColor=colors.HexColor("#2d2d2d"), fontName="Helvetica-Bold"))
styles.add(ParagraphStyle("Body", fontSize=9.8, leading=13.5, spaceAfter=7, alignment=TA_LEFT))
styles.add(ParagraphStyle("Caption", fontSize=8.3, leading=10.5, alignment=TA_CENTER,
                           textColor=colors.HexColor("#555555"), fontName="Helvetica-Oblique"))
styles.add(ParagraphStyle("TOCItem", fontSize=9.8, leading=15, spaceAfter=1))
styles.add(ParagraphStyle("CodeBlock", fontName="Courier", fontSize=7.8, leading=10.5,
                           backColor=CODE_BG, borderPadding=6, spaceAfter=8, spaceBefore=2))

PAGE_W, PAGE_H = A4


def tag(texto, cor=NAVY):
    t = Table([[Paragraph(f'<font color="white"><b>{texto}</b></font>', styles["Body"])]], colWidths=[None])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), cor),
        ("LEFTPADDING", (0, 0), (-1, -1), 8), ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    return t


def alerta(texto, titulo="Atenção", fundo=RED_LIGHT, borda=RED):
    p = Paragraph(f"<b>{titulo}:</b> {texto}", styles["Body"])
    t = Table([[p]], colWidths=[16.5 * cm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), fundo), ("BOX", (0, 0), (-1, -1), 0.75, borda),
        ("LEFTPADDING", (0, 0), (-1, -1), 10), ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 8), ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    return t


def code(texto):
    return Preformatted(texto, styles["CodeBlock"])


def bullets(itens):
    return ListFlowable(
        [ListItem(Paragraph(i, styles["Body"]), leftIndent=6) for i in itens],
        bulletType="bullet", start="•", leftIndent=14, spaceBefore=2, spaceAfter=8)


def numered(itens):
    return ListFlowable(
        [ListItem(Paragraph(i, styles["Body"])) for i in itens],
        bulletType="1", leftIndent=16, spaceBefore=2, spaceAfter=8)


def tabela(cabecalho, linhas, larguras):
    t = Table(
        [[Paragraph(f"<b>{c}</b>", styles["Body"]) for c in cabecalho]] +
        [[Paragraph(str(c), styles["Body"]) for c in linha] for linha in linhas],
        colWidths=larguras)
    t.setStyle(TableStyle([
        ("LINEBELOW", (0, 0), (-1, 0), 0.75, NAVY),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, NAVY_LIGHT]),
        ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 6), ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    return t


story = []

# ============================= CAPA =============================
story.append(Spacer(1, 5 * cm))
story.append(Paragraph("SisPTrab", styles["CoverTitle"]))
story.append(Paragraph("Sistema de Gestão de Planos de Trabalho", styles["CoverSubtitle"]))
story.append(Spacer(1, 1 * cm))
story.append(HRFlowable(width=8 * cm, thickness=1.2, color=NAVY, hAlign="CENTER"))
story.append(Spacer(1, 1 * cm))
story.append(Paragraph("Documentação Técnica", styles["CoverSubtitle"]))
story.append(Paragraph(
    "Arquitetura, modelo de dados, regras de negócio e guia de manutenção — "
    "para quem for assumir o desenvolvimento do projeto.",
    ParagraphStyle("CoverBody", parent=styles["Body"], alignment=TA_CENTER, fontSize=10)))
story.append(Spacer(1, 6 * cm))
story.append(Paragraph("Next.js 15 (App Router) · TypeScript · Prisma · PostgreSQL",
                        ParagraphStyle("Foot", parent=styles["Caption"], fontSize=9)))
story.append(PageBreak())

# ============================= SUMÁRIO =============================
story.append(Paragraph("Sumário", styles["H1"]))
indice = [
    "1. Visão geral e stack tecnológica",
    "2. Estrutura de pastas",
    "3. Modelo de dados (Prisma)",
    "4. Autenticação e autorização",
    "5. Motor de cálculo por Classe de Suprimento (I a X)",
    "6. Rateio de OMs e Naturezas de Despesa",
    "7. Geração de documentos (PDF e Excel)",
    "8. Importação de Plano de Trabalho",
    "9. Fluxo de aprovação",
    "10. Catálogos administráveis (Configurações)",
    "11. A Diretriz de Prontidão Logística 2026 no código",
    "12. Dívida técnica conhecida e próximos passos",
    "13. Como rodar o projeto localmente",
    "14. Convenções de código e decisões de design",
]
for item in indice:
    story.append(Paragraph(item, styles["TOCItem"]))
story.append(PageBreak())

# ============================= 1. VISÃO GERAL =============================
story.append(Paragraph("1. Visão geral e stack tecnológica", styles["H1"]))
story.append(Paragraph(
    "O SisPTrab é uma aplicação web full-stack construída inteiramente em "
    "<b>Next.js 15 (App Router)</b>, com rotas de API (<font face=\"Courier\">src/app/api/**/route.ts</font>) "
    "servindo tanto o front-end (React, client components) quanto o back-end "
    "(handlers HTTP), sem um serviço de back-end separado.", styles["Body"]))
story.append(tabela(
    ["Camada", "Tecnologia"],
    [
        ["Framework", "Next.js 15 (App Router), React 19, TypeScript"],
        ["Estilo", "Tailwind CSS"],
        ["Banco de dados", "PostgreSQL 16 (via Docker Compose em desenvolvimento)"],
        ["ORM", "Prisma 6"],
        ["Autenticação", "JWT em cookie httpOnly (src/lib/auth.ts), sem provedor externo"],
        ["Geração de PDF", "jsPDF + jspdf-autotable (client-side)"],
        ["Geração de Excel", "ExcelJS (client-side)"],
        ["Parsing de planilhas importadas", "ExcelJS (.xlsx) e SheetJS/xlsx (.xls, .ods)"],
        ["Extração de PDF (importação)", "pdf-parse"],
        ["Gráficos", "Recharts"],
    ],
    [5 * cm, 11.5 * cm]))
story.append(Spacer(1, 8))
story.append(Paragraph(
    "O domínio do sistema gira em torno de três conceitos: <b>Operação</b> (uma missão "
    "militar, com período, efetivo e OMs participantes), <b>Plano de Trabalho</b> "
    "(o detalhamento financeiro de uma OM dentro de uma Operação, em um dos 5 tipos "
    "suportados) e <b>Despesa</b> (um lançamento individual dentro de um Plano).", styles["Body"]))

# ============================= 2. ESTRUTURA DE PASTAS =============================
story.append(Paragraph("2. Estrutura de pastas", styles["H1"]))
story.append(code(
"""src/
  app/
    api/                 rotas de API (Next.js Route Handlers)
      operacoes/[id]/    CRUD de Operação, OMs participantes, import, anexos
      planos/[id]/       CRUD de Plano, despesas, itens-racao, itens-municao
      configuracoes/     preços, rascunhos de despesa operacional, catálogo de itens
      users/, auth/      usuários e autenticação
    dashboard/           páginas (App Router) protegidas por layout.tsx
  components/            componentes React por domínio (despesas/, operacoes/, planos/...)
  lib/
    calculos/            1 arquivo por Classe de Suprimento (classeI.ts ... classeX.ts)
    pdf/                 geradores de PDF (gerarPdfPlanoTrabalho.ts, gerarPdfPlanoRacaoMunicao.ts...)
    xlsx/                geradores de Excel (gerarXlsxPlanoTrabalho.ts, gerarXlsxDor.ts...)
    importacao/          parserPTrabModelo.ts — parser multi-formato de Plano de Trabalho
    consolidado/         construirConsolidado.ts — motor único de agrupamento "por OM"
    documentos/          montarDadosCabecalho.ts — cabeçalho oficial compartilhado PDF/Excel
    configuracoes/       fontes dos catálogos seedáveis (rascunhos, catálogo de itens)
    validators/          om-participante.ts — hierarquia de OM e canUserActOnOm
    permissions.ts       funções de permissão por Role (síncronas, sem acesso a banco)
    auth.ts              JWT / sessão
prisma/
  schema.prisma          modelo de dados
  seed.ts                popula OMs reais, naturezas, classes, catálogos, usuários demo
  migrations/             histórico de migrações
"""))

# ============================= 3. MODELO DE DADOS =============================
story.append(PageBreak())
story.append(Paragraph("3. Modelo de dados (Prisma)", styles["H1"]))
story.append(Paragraph("3.1 Entidades centrais", styles["H2"]))
story.append(tabela(
    ["Model", "Papel"],
    [
        ["OrganizacaoMilitar", "OM, com omPaiId formando a árvore de hierarquia (auto-relação)."],
        ["Operacao / OperacaoOM", "A missão; OperacaoOM é a tabela de junção com as OMs "
         "participantes e o valor limite de cada uma."],
        ["PlanoTrabalho", "Um plano, de um tipo (TipoPlano), de uma OM, dentro de uma Operação. "
         "Tem versao (inteiro) para suportar reenvios."],
        ["Despesa / DespesaOM / DespesaNatureza", "Uma linha de gasto do Plano Logístico. "
         "DespesaOM é o rateio por OM (omDestinoId × omCompradoraId × percentual); "
         "DespesaNatureza é o rateio por Natureza de Despesa."],
        ["DespesaOperacional / DespesaOperacionalNatureza", "Equivalente de Despesa para "
         "Planos Operacionais (GND3/GND4) — tem omDestino/omCompradora direto no registro "
         "(sem rateio percentual multi-OM)."],
        ["ItemRacaoR2 / ItemMunicao", "Linha de item+quantidade (sem valor em R$) dos Planos "
         "de Ração e Munição."],
        ["Classe / Tipo / NaturezaDespesa", "Catálogo de referência: Classe I–X, Tipo "
         "(subtipo dentro de uma Classe) e Natureza de Despesa (código ND, ex. 33.90.30)."],
        ["ConfiguracaoPreco", "Override de valor de um item de catálogo logístico (ausência "
         "de linha = usa o valor padrão hardcoded em src/lib/calculos/*.ts)."],
        ["RascunhoDespesaOperacional", "Modelo de texto (objeto/objetivo/finalidade/memória) "
         "para pré-preencher uma Despesa Operacional."],
        ["CatalogoItemMunicao / CatalogoItemRacao", "Itens pré-cadastrados selecionáveis ao "
         "lançar Munição/Ração."],
        ["AprovacaoHistorico / AuditoriaLog", "Trilha de decisões de aprovação e log de "
         "eventos do sistema."],
        ["AnexoOperacao", "PDF assinado (PTrab/DOR) anexado a uma Operação — conteúdo "
         "(Bytes) salvo direto no banco, sem storage externo configurado."],
    ],
    [4.3 * cm, 12.2 * cm]))

story.append(Paragraph("3.2 Enums importantes", styles["H2"]))
story.append(code(
"""enum TipoPlano   { LOGISTICO, OPERACIONAL_GND3, OPERACIONAL_GND4, RACAO_R2, MUNICAO }
enum Role        { COMANDANTE, S4, INTEGRANTE, SUPER_ADMIN }
enum StatusPlano { RASCUNHO, EM_ANALISE, APROVADO, REPROVADO }
"""))
story.append(alerta(
    "a Diretriz de Prontidão Logística 2026 define um 6º tipo de Plano, \"P Trab Log Horas "
    "de Voo\" (HV), que <b>não existe</b> no enum TipoPlano nem tem modelo/telas no sistema "
    "hoje. Ver seção 12.", titulo="Gap conhecido"))

story.append(Paragraph("3.3 User e campo \"cargo\"", styles["H2"]))
story.append(Paragraph(
    "O model <font face=\"Courier\">User</font> tem o campo de permissão "
    "<font face=\"Courier\">role: Role</font> (controla o que o usuário pode fazer) e um "
    "campo separado <font face=\"Courier\">cargo: String?</font> (S1, S2, S3, S4, "
    "Comandante etc. — ver <font face=\"Courier\">CARGOS_USUARIO</font> em "
    "<font face=\"Courier\">src/lib/constants.ts</font>), que é puramente informativo e "
    "não influencia nenhuma regra de autorização.", styles["Body"]))

# ============================= 4. AUTH =============================
story.append(PageBreak())
story.append(Paragraph("4. Autenticação e autorização", styles["H1"]))
story.append(Paragraph("4.1 Autenticação", styles["H2"]))
story.append(Paragraph(
    "Login (<font face=\"Courier\">POST /api/auth/login</font>) valida email+senha "
    "(bcrypt) e emite um JWT assinado, guardado em cookie httpOnly. "
    "<font face=\"Courier\">getCurrentUser()</font> em "
    "<font face=\"Courier\">src/lib/auth.ts</font> decodifica esse cookie em toda rota "
    "protegida; não há refresh token nem OAuth — é um esquema simples, "
    "deliberadamente sem complexidade extra.", styles["Body"]))

story.append(Paragraph("4.2 Autorização por Role", styles["H2"]))
story.append(Paragraph(
    "<font face=\"Courier\">src/lib/permissions.ts</font> contém funções <i>síncronas</i> "
    "(sem acesso a banco) que respondem perguntas do tipo \"esse Role pode aprovar?\", "
    "\"esse Role pode ver todos os planos?\" — usadas como primeiro filtro, "
    "independente de qual OM está envolvida.", styles["Body"]))

story.append(Paragraph("4.3 Autorização por OM (hierarquia)", styles["H2"]))
story.append(Paragraph(
    "A regra \"uma OM só age em nome dela mesma ou de uma subordinada\" está em "
    "<font face=\"Courier\">src/lib/validators/om-participante.ts</font>, função "
    "<font face=\"Courier\">canUserActOnOm(userRole, userOmId, omAlvoId)</font> — "
    "precisa de acesso ao banco (sobe a árvore de <font face=\"Courier\">omPaiId</font>), "
    "por isso é assíncrona e fica separada de permissions.ts.", styles["Body"]))
story.append(code(
"""export async function canUserActOnOm(
  userRole: Role, userOmId: string, omAlvoId: string
): Promise<boolean> {
  if (userRole === "SUPER_ADMIN") return true;
  if (userOmId === omAlvoId) return true;
  return isSubordinadaDeParticipante(omAlvoId, [userOmId]);
}
"""))
story.append(Paragraph(
    "Essa função é chamada em toda rota que cria/edita conteúdo de um Plano de Trabalho "
    "(despesas, itens de ração/munição, criação do próprio Plano) — é o mecanismo que "
    "garante, de forma genérica para qualquer OM (não hardcoded para nenhuma unidade "
    "específica), que uma OM não lance dados em nome de outra sem relação hierárquica.",
    styles["Body"]))
story.append(alerta(
    "ao adicionar uma nova rota de escrita associada a um Plano de Trabalho, sempre chame "
    "canUserActOnOm(user.role, user.omId, plano.omId) antes de persistir — é fácil "
    "esquecer esse passo, já que ele não é imposto por nenhum middleware central."))

# ============================= 5. MOTOR DE CÁLCULO =============================
story.append(PageBreak())
story.append(Paragraph("5. Motor de cálculo por Classe de Suprimento (I a X)", styles["H1"]))
story.append(Paragraph(
    "Cada Classe de Suprimento tem seu próprio módulo em "
    "<font face=\"Courier\">src/lib/calculos/classeN.ts</font>, com uma assinatura "
    "parecida: recebe os parâmetros do formulário, calcula o valor e monta o texto da "
    "\"memória de cálculo\" (o <font face=\"Courier\">carimbo</font>). Não há uma interface "
    "TypeScript formal compartilhada entre as classes — cada uma evoluiu de forma "
    "relativamente independente, mas o padrão de nomes se repete "
    "(<font face=\"Courier\">calcularClasseN</font>, <font face=\"Courier\">gerarCarimbo</font>).",
    styles["Body"]))
story.append(Paragraph("5.1 Catálogos de referência e overrides", styles["H2"]))
story.append(Paragraph(
    "Cada classe exporta uma tabela de itens com valores hardcoded (ex. "
    "<font face=\"Courier\">ARMAMENTOS</font> em classeV.ts, "
    "<font face=\"Courier\">VIATURAS</font> em classeIX.ts) — esses valores foram "
    "conferidos contra a Diretriz de Prontidão Logística 2026 nesta sessão de manutenção "
    "(ver seção 11). O admin pode sobrescrever qualquer valor individual via "
    "<font face=\"Courier\">ConfiguracaoPreco</font>, aplicado em runtime por "
    "<font face=\"Courier\">src/lib/configuracoes/hidratarPrecos.ts</font>, que roda uma "
    "vez por carregamento de formulário e chama as funções "
    "<font face=\"Courier\">aplicarOverrides*</font> exportadas por cada classeN.ts.",
    styles["Body"]))
story.append(Paragraph("5.2 Reservas e fatores (atenção à terminologia)", styles["H2"]))
story.append(tabela(
    ["Classe", "Mecanismo", "Base legal"],
    [
        ["III (combustível)", "Sem margem — litros = consumo × distância/horas, direto das "
         "tabelas de referência.", "Ap. 2, item 3 — exemplos oficiais não aplicam fator."],
        ["VI (engenharia)", "Reserva de 10% sobre o total (matematicamente igual a aplicar "
         "×1,1 por item e somar).", "Ap. 2, item 6.b.5."],
        ["VIII (saúde)", "Reserva de 20% sobre o total.", "Ap. 2, item 8.b."],
        ["V (armamento)", "8% do valor do MEM por ano, dividido por 365.", "Ap. 2, item 5.a."],
        ["VII (eletrônica)", "2× valor de aquisição, dividido por (vida útil em anos × "
         "365) — 20 anos padrão, 10 anos para material crítico.", "Ap. 2, item 7.1."],
        ["IX (viaturas)", "Percentual do valor do MEM por ano, variando por grupo de peso "
         "(6,3% / 8% / 9,4% / 4% conforme a categoria).", "Ap. 2, item 5."],
    ],
    [2.7 * cm, 8.3 * cm, 5.5 * cm]))
story.append(alerta(
    "CONFIG_FATOR_SEGURANCA (classeVI.ts) e CONFIG_FATOR_SEGURANCA_CLASSE_III (classeIII.ts) "
    "são nomes legados — o de Classe VI representa uma <i>reserva</i> de eventualidades "
    "(prevista na Diretriz), não uma margem de incerteza; o de Classe III foi zerado "
    "(padrão 1.0) porque a Diretriz não prevê nenhuma margem para combustível. Evite "
    "reintroduzir um valor >1.0 em CONFIG_FATOR_SEGURANCA_CLASSE_III sem uma fonte "
    "doutrinária explícita."))

# ============================= 6. RATEIO =============================
story.append(PageBreak())
story.append(Paragraph("6. Rateio de OMs e Naturezas de Despesa", styles["H1"]))
story.append(Paragraph(
    "Uma Despesa (Classe I–X) pode ser dividida entre várias OMs e várias Naturezas de "
    "Despesa ao mesmo tempo, cada divisão com seu próprio percentual (que deve somar "
    "100%). Para cada OM do rateio existem dois papéis, que podem apontar para OMs "
    "diferentes:", styles["Body"]))
story.append(bullets([
    "<b>omDestinoId</b> — a OM que recebe/usa o recurso;",
    "<b>omCompradoraId</b> — a OM (UGE) que empenha/paga.",
]))
story.append(Paragraph(
    "Além desses dois, existe um terceiro conceito, introduzido nesta sessão de "
    "manutenção: a <b>OM titular (\"owner\")</b> — a OM dona do Plano de Trabalho "
    "(<font face=\"Courier\">PlanoTrabalho.omId</font>), que <b>nunca muda</b> em função "
    "do rateio de uma despesa individual. Antes dessa correção, os documentos agrupavam e "
    "rotulavam \"OM RESPONSÁVEL\" pela OM destino do rateio — o que fazia um Plano de uma "
    "OM aparecer rotulado com o nome de outra OM sempre que havia rateio para fora.",
    styles["Body"]))
story.append(Paragraph(
    "O agrupamento \"por OM\" usado nos documentos consolidados é centralizado em "
    "<font face=\"Courier\">src/lib/consolidado/construirConsolidado.ts</font>, função "
    "<font face=\"Courier\">agruparConsolidado(linhas, opts)</font>, com três chaves "
    "possíveis:", styles["Body"]))
story.append(code(
"""chaveAgrupamento: "owner"      // padrão — usado pelo Plano de Trabalho / "OM RESPONSÁVEL"
                 | "destino"    // usado pelo resumo financeiro por recipiente (DOR-like)
                 | "comprador"  // usado pela DOR/empenho
"""))
story.append(Paragraph(
    "Ao adicionar um novo gerador de documento que agrupe despesas por OM, use essa "
    "função em vez de reimplementar o agrupamento manualmente — é o que garante "
    "consistência entre PDF, Excel e qualquer formato futuro.", styles["Body"]))

# ============================= 7. GERAÇÃO DE DOCUMENTOS =============================
story.append(PageBreak())
story.append(Paragraph("7. Geração de documentos (PDF e Excel)", styles["H1"]))
story.append(Paragraph(
    "Toda geração de PDF/Excel acontece <b>no navegador</b> (client-side), não no "
    "servidor — os componentes React chamam diretamente as funções de "
    "<font face=\"Courier\">src/lib/pdf/</font> e <font face=\"Courier\">src/lib/xlsx/</font> "
    "depois de buscar os dados via fetch.", styles["Body"]))
story.append(Paragraph("7.1 Geradores de PDF", styles["H2"]))
story.append(tabela(
    ["Arquivo", "Cobre"],
    [
        ["gerarPdfPlanoTrabalho.ts", "Logístico (Classes I–X)."],
        ["gerarPdfPlanoTrabalhoOperacional.ts", "Operacional GND3/GND4."],
        ["gerarPdfPlanoRacaoMunicao.ts", "Ração (R-2) e Munição — criado nesta sessão; "
         "antes desses dois tipos não tinham PDF, só Excel."],
    ],
    [6.3 * cm, 10.2 * cm]))
story.append(Paragraph(
    "Todas as três funções aceitam um parâmetro opcional <font face=\"Courier\">docExistente: "
    "jsPDF</font>: se informado, desenham numa página nova do documento recebido em vez de "
    "criar e salvar um arquivo próprio. Isso existe porque o fluxo \"Assinar no gov.br\" "
    "precisa reunir todos os tipos de plano presentes num <b>único</b> arquivo final — "
    "gerar vários downloads automáticos separados faz o navegador bloquear os downloads "
    "depois do primeiro.", styles["Body"]))
story.append(code(
"""let docCombinado: jsPDF | undefined;
if (planosLogisticos.length > 0) {
  docCombinado = await gerarPdfPlanoTrabalho(planosLogisticos, operacao, undefined, opcoes,
                                              omsIncluidas, docCombinado);
}
if (planosOperacionais.length > 0) {
  docCombinado = await gerarPdfPlanoTrabalhoOperacional(..., docCombinado);
}
// ...Ração, Munição...
if (docCombinado) docCombinado.save(`plano_trabalho_${operacao.nome}.pdf`);
"""))
story.append(Paragraph("7.2 Geradores de Excel", styles["H2"]))
story.append(Paragraph(
    "Seguem o mesmo padrão de agrupamento via construirConsolidado. O cabeçalho oficial "
    "(Ministério da Defesa / Exército / OM / título) é compartilhado entre PDF e Excel via "
    "<font face=\"Courier\">src/lib/documentos/montarDadosCabecalho.ts</font> — para o "
    "Excel, inclui opcionalmente os dados da Operação (período, efetivo, ações) através do "
    "campo <font face=\"Courier\">dadosOperacao</font>, adicionado nesta sessão para "
    "igualar o conteúdo do cabeçalho do PDF.", styles["Body"]))
story.append(Paragraph(
    "Os nomes de arquivo de todos os exports de um único Plano incluem a sigla da OM "
    "(ex. <font face=\"Courier\">plano_trabalho_6oBEC_Operacao_X.pdf</font>) — antes "
    "usavam só o nome da Operação, então baixar o mesmo tipo de documento de OMs "
    "diferentes colidia no mesmo nome de arquivo.", styles["Body"]))

# ============================= 8. IMPORTAÇÃO =============================
story.append(PageBreak())
story.append(Paragraph("8. Importação de Plano de Trabalho", styles["H1"]))
story.append(Paragraph(
    "<font face=\"Courier\">src/lib/importacao/parserPTrabModelo.ts</font> interpreta um "
    "arquivo externo no layout do modelo oficial do Exército (coluna de OM/UGE, colunas de "
    "ND, coluna de Detalhamento). O núcleo da heurística de detecção de cabeçalho/colunas "
    "está isolado em <font face=\"Courier\">processarAba(nomeAba, linhasAba, avisos)</font>, "
    "que recebe uma matriz <font face=\"Courier\">string[][]</font> já normalizada — isso "
    "permite reaproveitar a mesma lógica para três fontes de leitura diferentes:", styles["Body"]))
story.append(tabela(
    ["Formato", "Função", "Biblioteca"],
    [
        [".xlsx", "parsePTrabXlsx", "exceljs (lê células, preserva texto rico)"],
        [".xls / .ods", "parsePTrabSheetJs", "xlsx (SheetJS) — adicionado nesta sessão"],
        [".pdf", "parsePTrabPdf", "pdf-parse, extração de texto best-effort (sem "
         "estrutura de tabela; fidelidade inferior)"],
    ],
    [2.3 * cm, 4.2 * cm, 10 * cm]))
story.append(Paragraph("8.1 Divisão automática por OM", styles["H2"]))
story.append(Paragraph(
    "A rota <font face=\"Courier\">POST /api/operacoes/[id]/importar</font> cria <b>um "
    "Plano de Trabalho por OM detectada</b> no arquivo (via "
    "<font face=\"Courier\">acharOmPorTexto</font> na coluna OM/UGE de cada linha), em vez "
    "de um único Plano fixo na OM escolhida no diálogo — essa era a principal limitação "
    "corrigida nesta sessão para suportar arquivos consolidados reais (um único arquivo "
    "trazendo os lançamentos de várias OMs ao mesmo tempo).", styles["Body"]))
story.append(code(
"""const planosPorOm = new Map<string, { id: string; titulo: string }>();
async function getOuCriarPlano(omId: string) { /* get-or-create, 1 por OM detectada */ }

for (const linha of linhas) {
  const omAlvo = acharOmPorTexto(linha.omTexto, operacao.omsParticipantes) || omIdPadrao;
  const plano = await getOuCriarPlano(omAlvo);
  // ...cria Despesa/DespesaOperacional em plano.id
}
"""))
story.append(alerta(
    "limitações conhecidas do importador, verificadas com arquivos reais da Operação "
    "Catrimani II: (1) abas de operações antigas dentro do mesmo arquivo (abas homônimas "
    "versionadas) não são distinguidas de abas válidas — só o nome da aba é usado para "
    "pular abas de resumo/totais; (2) omDestinoId e omCompradoraId são sempre gravados "
    "iguais (= omAlvo), mesmo quando a planilha de origem distinguia \"quem paga\" de "
    "\"quem usa\" na memória de cálculo da linha."))

# ============================= 9. APROVAÇÃO =============================
story.append(PageBreak())
story.append(Paragraph("9. Fluxo de aprovação", styles["H1"]))
story.append(Paragraph(
    "A cadeia de aprovação é <b>dinâmica</b>, construída a partir da hierarquia de OMs "
    "(não é uma lista fixa de aprovadores) — ver "
    "<font face=\"Courier\">src/lib/approval-chain.ts</font>. Ao enviar um Plano para "
    "análise (<font face=\"Courier\">POST /api/planos/[id]/enviar-analise</font>), o "
    "sistema sobe a árvore de <font face=\"Courier\">omPaiId</font> a partir da OM titular "
    "do Plano, montando os níveis que precisam aprovar em sequência. Cada decisão "
    "(aprovar/reprovar) grava uma linha em <font face=\"Courier\">AprovacaoHistorico</font>.",
    styles["Body"]))

# ============================= 10. CATÁLOGOS =============================
story.append(Paragraph("10. Catálogos administráveis (Configurações)", styles["H1"]))
story.append(tabela(
    ["Área (UI)", "Model(s)", "Uso"],
    [
        ["Preços", "ConfiguracaoPreco", "Override de valores de referência usados pelos "
         "módulos de cálculo (classeN.ts)."],
        ["Despesa Operacional", "RascunhoDespesaOperacional", "Modelos de texto para "
         "pré-preencher uma nova Despesa Operacional (GND3/GND4)."],
        ["Hierarquia", "OrganizacaoMilitar.omPaiId", "Árvore de subordinação — base de "
         "permissões e da cadeia de aprovação."],
        ["Catálogo de Itens", "CatalogoItemMunicao, CatalogoItemRacao", "Itens "
         "pré-cadastrados selecionáveis ao lançar Munição/Ração — adicionado nesta "
         "sessão, seedado com a Lista nº 3 oficial de munição da Diretriz 2026."],
    ],
    [3.3 * cm, 5.7 * cm, 7.5 * cm]))

# ============================= 11. DIRETRIZ =============================
story.append(PageBreak())
story.append(Paragraph("11. A Diretriz de Prontidão Logística 2026 no código", styles["H1"]))
story.append(Paragraph(
    "Boa parte dos valores de referência e regras de cálculo do sistema são extraídos "
    "diretamente da Diretriz de Prontidão Logística 2026 do COLOG (documento interno, não "
    "versionado neste repositório). A tabela abaixo ajuda a localizar, no código, onde "
    "cada seção da Diretriz foi implementada — útil para quando uma nova edição da "
    "Diretriz for publicada e os valores precisarem ser atualizados.", styles["Body"]))
story.append(tabela(
    ["Seção da Diretriz", "Onde está no código"],
    [
        ["Ap. 2, §1 — QR/QS (R$ 7,00 / R$ 10,00)", "src/lib/constants.ts — VALORES_REFEICAO"],
        ["Ap. 2, §2 — Classe II (Intendência)", "src/lib/calculos/classeII.ts"],
        ["Ap. 2, §3 — Classe III (combustível)", "src/lib/calculos/classeIII.ts — "
         "tabelas VIATURAS/EQUIPAMENTOS"],
        ["Ap. 2, §5 — Classe V (armamento) / Classe IX (viaturas)", "classeV.ts "
         "(ARMAMENTOS) / classeIX.ts (VIATURAS) — ambas conferidas linha a linha; "
         "classeIX.ts tinha valores desatualizados e foi corrigida nesta sessão"],
        ["Ap. 2, §6 — Classe VI (engenharia)", "classeVI.ts — tabela EQUIPAMENTOS, reserva "
         "CONFIG_FATOR_SEGURANCA"],
        ["Ap. 2, §7 — Classe VII (comunicações/TI)", "classeVII.ts — tabela EQUIPAMENTOS"],
        ["Ap. 2, §8 — Classe VIII (saúde)", "classeVIII.ts — CONFIG_RESERVA_CLASSE_VIII "
         "(20%), adicionada nesta sessão (antes não existia)"],
        ["Ap. 1, item 9 (nomes das 10 Classes)", "prisma/seed.ts — campo descricao de "
         "cada Classe; Classe II/VI/VII corrigidas nesta sessão"],
        ["Ap. 3, Figura 1 — checklist de objeto GND3", "src/lib/configuracoes/"
         "rascunhoDespesaOperacional.ts — SEED_RASCUNHOS_DESPESA_OPERACIONAL (20 "
         "modelos; 6 adicionados nesta sessão)"],
        ["Anexo B — Lista nº 3 de munição", "src/lib/configuracoes/catalogoItensOficial.ts "
         "— SEED_CATALOGO_MUNICAO"],
    ],
    [5.7 * cm, 10.8 * cm]))

# ============================= 12. DÍVIDA TÉCNICA =============================
story.append(PageBreak())
story.append(Paragraph("12. Dívida técnica conhecida e próximos passos", styles["H1"]))
story.append(Paragraph(
    "Itens identificados mas <b>não implementados</b> durante a revisão desta sessão, em "
    "ordem aproximada de impacto:", styles["Body"]))
story.append(numered([
    "<b>P Trab Log Horas de Voo (HV)</b> ausente — a Diretriz define 6 tipos de Plano, o "
    "sistema cobre 5 (falta TipoPlano.HORAS_VOO + modelo ItemHorasVoo + telas + "
    "gerador de PDF/Excel). É estruturalmente parecido com Ração/Munição (só "
    "tipo/quantidade/local, sem valor em R$ no nível da OM).",
    "<b>Complemento de operação (20%) do QR/QS para operações longas</b> não está "
    "implementado — a fórmula exata (com o corte nos 22 e 30 dias) está documentada em "
    "src/lib/calculos/classeI.ts via comentário, mas o cálculo em si ainda não aplica a "
    "regra de \"mais de 22 dias\" descrita no Apêndice 2 da Diretriz.",
    "<b>Importador não distingue OM destino de OM compradora</b> dentro de uma linha "
    "importada — grava os dois campos iguais. Para corrigir, o parser precisaria "
    "reconhecer o padrão \"Destinado ao X\" dentro do texto de Detalhamento.",
    "<b>Abas antigas/homônimas dentro de um mesmo arquivo de importação</b> (ex. versões "
    "anteriores de um P Trab, de operações diferentes) não são descartadas — só abas "
    "cujo nome bate com /dados.*não editar|totais gerais/i são puladas. Vale avaliar um "
    "aviso mais explícito quando o nome da Operação dentro do conteúdo da aba não bater "
    "com a Operação selecionada na importação.",
    "<b>Classe IX não-blindada</b> — a tabela foi corrigida nesta sessão a partir dos "
    "itens com nome equivalente na Diretriz 2026, mas alguns itens do catálogo do "
    "sistema não têm correspondência 1:1 clara na tabela oficial (nomenclatura "
    "ligeiramente diferente) — vale uma segunda conferência com alguém com acesso à "
    "Diretriz original.",
    "<b>Reserva/fator de segurança</b> — nomes de variável legados "
    "(CONFIG_FATOR_SEGURANCA) ainda falam em \"fator de segurança\" no código, apesar de "
    "a Diretriz tratar como \"reserva de eventualidades\"; só o texto exibido ao usuário "
    "foi corrigido, os nomes internos das constantes não foram renomeados para não "
    "ampliar o diff.",
]))

# ============================= 13. SETUP LOCAL =============================
story.append(PageBreak())
story.append(Paragraph("13. Como rodar o projeto localmente", styles["H1"]))
story.append(code(
"""# 1. Subir o Postgres (Docker Desktop precisa estar rodando)
docker compose up -d

# 2. Instalar dependências
npm install

# 3. Aplicar migrações
npx prisma migrate deploy      # ou: npm run db:migrate (ambiente dev)

# 4. Popular dados de referência (OMs reais, classes, naturezas, catálogos, usuários demo)
#    ATENÇÃO: isto APAGA e recria usuários/operações/planos existentes no banco.
npm run db:seed

# 5. Rodar em desenvolvimento
npm run dev          # http://localhost:3000

# 6. Build de produção
npm run build && npm run start
"""))
story.append(Paragraph(
    "Credenciais do Super Admin após o seed: <font face=\"Courier\">admin@eb.mil.br</font> "
    "/ <font face=\"Courier\">admin123</font>. Demais usuários seguem o padrão "
    "<font face=\"Courier\">integrante.[sigla]@eb.mil.br</font> / "
    "<font face=\"Courier\">s4.[sigla]@eb.mil.br</font>, senha "
    "<font face=\"Courier\">senha123</font>.", styles["Body"]))
story.append(alerta(
    "o script prisma/seed.ts faz deleteMany() em cascata nas tabelas principais antes de "
    "recriar os dados — a ordem de limpeza importa por causa de chaves estrangeiras sem "
    "onDelete: Cascade (ex.: DespesaOperacionalNatureza/ArtigoConsulta/AnexoOperacao "
    "referenciando NaturezaDespesa/User). Dois gaps de ordem foram corrigidos nesta sessão; "
    "ao adicionar um novo model referenciando User, Classe ou NaturezaDespesa, adicione "
    "também o deleteMany() correspondente, na posição certa, em prisma/seed.ts.",
    titulo="Cuidado ao editar o seed"))

# ============================= 14. CONVENÇÕES =============================
story.append(Paragraph("14. Convenções de código e decisões de design", styles["H1"]))
story.append(bullets([
    "Nomes de variáveis, funções e comentários em <b>português</b> (domínio militar "
    "brasileiro) — só nomes de tecnologias/bibliotecas ficam em inglês;",
    "Geração de documento (PDF/Excel) sempre no <b>client-side</b> — não há endpoint de "
    "servidor que devolva um binário de PDF/Excel pronto;",
    "Toda tela sensível a OM usa <font face=\"Courier\">canUserActOnOm</font> ou um "
    "filtro equivalente no servidor — nunca confie apenas em esconder um botão no "
    "front-end como controle de acesso;",
    "Comentários no código tendem a explicar o <i>porquê</i> de uma decisão não óbvia "
    "(ex.: por que um agrupamento é por owner e não por destino) — ao modificar essa "
    "lógica, atualize o comentário junto;",
    "Testes automatizados: o projeto não tem uma suíte de testes configurada hoje — "
    "validação é feita via <font face=\"Courier\">npx tsc --noEmit</font>, "
    "<font face=\"Courier\">npm run build</font> e testes manuais via navegador.",
]))
story.append(Spacer(1, 16))
story.append(HRFlowable(width=16 * cm, thickness=0.5, color=colors.HexColor("#999999")))
story.append(Paragraph("SisPTrab — Documentação Técnica · gerada a partir do estado do repositório",
                        styles["Caption"]))


def on_page(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(colors.HexColor("#888888"))
    canvas.drawString(2 * cm, 1.2 * cm, "SisPTrab — Documentação Técnica")
    canvas.drawRightString(PAGE_W - 2 * cm, 1.2 * cm, f"Página {doc.page}")
    canvas.restoreState()


doc = SimpleDocTemplate(
    OUT, pagesize=A4,
    leftMargin=2 * cm, rightMargin=2 * cm, topMargin=1.8 * cm, bottomMargin=1.8 * cm,
    title="SisPTrab - Documentacao Tecnica", author="SisPTrab",
)
doc.build(story, onFirstPage=on_page, onLaterPages=on_page)
print("OK:", OUT)
