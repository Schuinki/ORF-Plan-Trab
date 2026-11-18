# -*- coding: utf-8 -*-
"""Gera Manual_SisPTrab.pdf (manual do usuário, ~40 páginas) a partir de
conteúdo estruturado + screenshots reais em Prints_SisPTrab/.
"""
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Image, PageBreak, Table, TableStyle,
    ListFlowable, ListItem, HRFlowable, KeepTogether, NextPageTemplate,
)
from reportlab.platypus.flowables import Flowable

BASE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
IMG = os.path.join(BASE, "Prints_SisPTrab")
OUT = os.path.join(BASE, "Manual_SisPTrab.pdf")

GREEN = colors.HexColor("#3f5a34")
GREEN_LIGHT = colors.HexColor("#eef2ea")
AMBER = colors.HexColor("#92620a")
AMBER_LIGHT = colors.HexColor("#fdf3e0")

styles = getSampleStyleSheet()
styles.add(ParagraphStyle("CoverTitle", fontSize=30, leading=36, alignment=TA_CENTER,
                           textColor=GREEN, spaceAfter=10, fontName="Helvetica-Bold"))
styles.add(ParagraphStyle("CoverSubtitle", fontSize=15, leading=20, alignment=TA_CENTER,
                           textColor=colors.HexColor("#444444"), spaceAfter=6))
styles.add(ParagraphStyle("H1", fontSize=19, leading=23, spaceBefore=4, spaceAfter=12,
                           textColor=GREEN, fontName="Helvetica-Bold"))
styles.add(ParagraphStyle("H2", fontSize=14, leading=18, spaceBefore=14, spaceAfter=8,
                           textColor=GREEN, fontName="Helvetica-Bold"))
styles.add(ParagraphStyle("H3", fontSize=11.5, leading=15, spaceBefore=10, spaceAfter=6,
                           textColor=colors.HexColor("#2d2d2d"), fontName="Helvetica-Bold"))
styles.add(ParagraphStyle("Body", fontSize=10.3, leading=14.5, spaceAfter=8,
                           alignment=TA_LEFT, fontName="Helvetica"))
styles.add(ParagraphStyle("BodyBold", parent=styles["Body"], fontName="Helvetica-Bold"))
styles.add(ParagraphStyle("Caption", fontSize=8.7, leading=11, spaceBefore=2, spaceAfter=10,
                           alignment=TA_CENTER, textColor=colors.HexColor("#555555"),
                           fontName="Helvetica-Oblique"))
styles.add(ParagraphStyle("Perfil", fontSize=8.7, leading=11, spaceAfter=6,
                           textColor=colors.white, fontName="Helvetica-Bold"))
styles.add(ParagraphStyle("TOCItem", fontSize=10.3, leading=16, spaceAfter=2))

PAGE_W, PAGE_H = A4


def perfil_tag(texto, cor=GREEN):
    t = Table([[Paragraph(texto, styles["Perfil"])]], colWidths=[None])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), cor),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    return t


def nota(texto, titulo="Dica", cor_fundo=AMBER_LIGHT, cor_borda=AMBER):
    p = Paragraph(f"<b>{titulo}:</b> {texto}", styles["Body"])
    t = Table([[p]], colWidths=[16 * cm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), cor_fundo),
        ("BOX", (0, 0), (-1, -1), 0.75, cor_borda),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    return t


def img(nome, legenda, largura=15.5 * cm):
    caminho = os.path.join(IMG, nome)
    if not os.path.exists(caminho):
        return Paragraph(f"[imagem {nome} não encontrada]", styles["Caption"])
    from PIL import Image as PILImage
    w, h = PILImage.open(caminho).size
    altura = largura * h / w
    elems = [Image(caminho, width=largura, height=altura)]
    if legenda:
        elems.append(Paragraph(legenda, styles["Caption"]))
    return KeepTogether(elems)


def bullets(itens):
    return ListFlowable(
        [ListItem(Paragraph(i, styles["Body"]), leftIndent=6) for i in itens],
        bulletType="bullet", start="•", leftIndent=14, spaceBefore=2, spaceAfter=8,
    )


def numered(itens):
    return ListFlowable(
        [ListItem(Paragraph(i, styles["Body"])) for i in itens],
        bulletType="1", leftIndent=16, spaceBefore=2, spaceAfter=8,
    )


story = []

# ============================= CAPA =============================
story.append(Spacer(1, 5 * cm))
story.append(Paragraph("SisPTrab", styles["CoverTitle"]))
story.append(Paragraph("Sistema de Gestão de Planos de Trabalho", styles["CoverSubtitle"]))
story.append(Spacer(1, 1 * cm))
story.append(HRFlowable(width=8 * cm, thickness=1.2, color=GREEN, hAlign="CENTER"))
story.append(Spacer(1, 1 * cm))
story.append(Paragraph("Manual Ilustrado do Usuário", styles["CoverSubtitle"]))
story.append(Paragraph(
    "Guia completo, passo a passo, em linguagem simples — com fotos de tela de cada "
    "área do sistema e explicação do que cada uma faz e para que serve.",
    ParagraphStyle("CoverBody", parent=styles["Body"], alignment=TA_CENTER, fontSize=10.5)))
story.append(Spacer(1, 6 * cm))
story.append(Paragraph("Exército Brasileiro — Documento gerado a partir do sistema em funcionamento",
                        ParagraphStyle("Foot", parent=styles["Caption"], fontSize=9)))
story.append(PageBreak())

# ============================= ÍNDICE =============================
story.append(Paragraph("Sumário", styles["H1"]))
indice = [
    "1. O que é o SisPTrab",
    "2. Como entrar no sistema (Login)",
    "3. Painel Principal (Dashboard)",
    "4. Menu de Navegação",
    "5. Operações — cadastro e gestão",
    "6. Quem vê o quê: OMs, hierarquia e permissões",
    "7. Os tipos de Plano de Trabalho",
    "8. Plano de Trabalho Logístico (Classes I a X)",
    "9. Plano de Trabalho Operacional (GND 3 e GND 4)",
    "10. Plano de Trabalho de Ração Operacional (R-2)",
    "11. Plano de Trabalho de Munição",
    "12. Importando um Plano de Trabalho pronto",
    "13. Enviando para Análise e a Cadeia de Aprovação",
    "14. Assinando no gov.br",
    "15. Documentos Assinados da Operação (PTrab e DOR)",
    "16. Consulta — biblioteca de referência",
    "17. Usuários — administração de acessos",
    "18. Configurações (apenas Administrador)",
    "19. Exemplo prático completo, do início ao fim",
    "20. Glossário de termos e siglas",
    "21. Dúvidas comuns e solução de problemas",
    "22. Resumo final — o caminho normal de uso",
]
for item in indice:
    story.append(Paragraph(item, styles["TOCItem"]))
story.append(PageBreak())

# ============================= 1. O QUE É =============================
story.append(Paragraph("1. O que é o SisPTrab?", styles["H1"]))
story.append(Paragraph(
    "O SisPTrab é um sistema do Exército Brasileiro usado para organizar e controlar os "
    "<b>Planos de Trabalho</b> de operações militares: quanto dinheiro cada Organização "
    "Militar (OM) pode gastar, em quê, e quem precisa aprovar cada gasto.",
    styles["Body"]))
story.append(Paragraph(
    "Pense nele como uma \"planilha inteligente online\" compartilhada entre várias "
    "unidades, que substitui o controle manual em Excel/papel por um sistema único, "
    "com cálculos automáticos, regras oficiais já embutidas e histórico de aprovações.",
    styles["Body"]))
story.append(Paragraph("De forma resumida, o sistema ajuda a responder três perguntas em qualquer operação:", styles["Body"]))
story.append(bullets([
    "<b>Quanto</b> cada OM pode gastar (o teto/valor limite definido na Operação);",
    "<b>Em quê</b> esse dinheiro será gasto (alimentação, combustível, munição, manutenção, diárias, equipamentos etc.);",
    "<b>Quem precisa aprovar</b> cada Plano de Trabalho antes que o gasto seja efetivado.",
]))
story.append(Paragraph(
    "Todos os cálculos de valor seguem a <b>Diretriz de Prontidão Logística 2026</b> do "
    "Comando Logístico (COLOG) — por exemplo, o valor da etapa de alimentação (QR/QS), a "
    "fórmula de manutenção de viaturas e armamento, e a reserva obrigatória de "
    "eventualidades já vêm certos por padrão, para que o usuário não precise decorar "
    "nenhuma fórmula.", styles["Body"]))
story.append(nota(
    "o SisPTrab não substitui o julgamento profissional de quem monta o Plano de Trabalho — "
    "ele automatiza os cálculos e a organização dos dados, mas a qualidade da despesa "
    "(justificativa, memória de cálculo, enquadramento correto) continua sendo responsabilidade "
    "de quem lança.", titulo="Importante"))

story.append(Paragraph("1.1 De onde vêm os números que o sistema calcula?", styles["H2"]))
story.append(Paragraph(
    "Todo ano o Comando Logístico (COLOG) publica a <b>Diretriz de Prontidão Logística</b>, "
    "um documento oficial que define os valores e fórmulas de referência para o custeio de "
    "operações militares — quanto custa a alimentação por militar/dia, como calcular a "
    "manutenção de uma viatura ou de uma arma, quais reservas de eventualidade são "
    "obrigatórias, e assim por diante. O SisPTrab tem essas regras já programadas, então "
    "quem lança uma despesa não precisa consultar a Diretriz nem fazer contas na mão.",
    styles["Body"]))
story.append(Paragraph(
    "Essa Diretriz também define os <b>tipos oficiais de Plano de Trabalho</b> que uma "
    "Organização Militar pode precisar montar:", styles["Body"]))
story.append(bullets([
    "<b>P Trab Logístico (GND 3)</b> — suprimentos e manutenção, pelas Classes I a X;",
    "<b>P Trab de Ração Operacional</b> — itens de ração, só quantidade;",
    "<b>P Trab de Munição</b> — itens de munição, só quantidade;",
    "<b>P Trab de Horas de Voo</b> — emprego da aviação do Exército (cálculo feito "
    "centralmente pelo COTER/CMAvEx);",
    "<b>P Trab Operacional (GND 3)</b> — diárias, passagens, serviços ligados à execução "
    "da operação;",
    "<b>P Trab Operacional de Material Permanente (GND 4)</b> — aquisição de equipamentos.",
]))
story.append(Paragraph(
    "O SisPTrab hoje cobre os quatro primeiros tipos mais usados no dia a dia das OMs "
    "(Logístico, Ração, Munição e Operacional GND 3/GND 4) — o Plano de Horas de Voo, por "
    "ter um fluxo de cálculo centralizado e próprio, ainda não tem uma tela dedicada no "
    "sistema.", styles["Body"]))
story.append(nota(
    "sempre que o Administrador atualiza um valor de referência em Configurações (capítulo "
    "18), ele está, na prática, ajustando o sistema para acompanhar uma eventual revisão da "
    "Diretriz de Prontidão Logística — não é necessário nenhum conhecimento técnico de "
    "programação para isso."))

# ============================= 2. LOGIN =============================
story.append(Paragraph("2. Como entrar no sistema (Login)", styles["H1"]))
story.append(perfil_tag("Todos os usuários"))
story.append(Paragraph(
    "Esta é a primeira tela que você vê ao abrir o SisPTrab no navegador. Para entrar, "
    "digite o seu e-mail institucional (@eb.mil.br) e a sua senha, depois clique no botão "
    "<b>Entrar</b>.", styles["Body"]))
story.append(nota(
    "se você esqueceu a senha ou não tem um acesso ainda, procure o Administrador do "
    "Sistema da sua Organização Militar — é ele quem cria novos usuários (veja o "
    "capítulo \"Usuários\")."))
story.append(img("00-login.jpg", "Tela de login: campo de e-mail, campo de senha e botão \"Entrar\"."))

# ============================= 3. DASHBOARD =============================
story.append(Paragraph("3. Painel Principal (Dashboard)", styles["H1"]))
story.append(perfil_tag("Todos os usuários"))
story.append(Paragraph(
    "Assim que você entra, o sistema mostra o Dashboard: um resumo visual de tudo o que "
    "está acontecendo no seu \"escopo\" — ou seja, na sua OM e nas que estão abaixo dela "
    "na hierarquia, se houver.", styles["Body"]))
story.append(Paragraph("Os cartões do topo mostram números importantes de forma rápida:", styles["Body"]))
story.append(bullets([
    "<b>Valor Total Movimentado</b> — soma de tudo que já foi lançado em despesas (logístico + operacional);",
    "<b>Operações</b> — quantas operações existem e quantas estão em andamento;",
    "<b>Planos de Trabalho</b> — quantos planos foram criados e quantos já tiveram decisão (aprovados/reprovados);",
    "<b>Efetivo Mobilizado</b> — soma de militares e agentes externos nas operações do seu escopo;",
    "<b>Taxa de Aprovação</b> e <b>Tempo Médio para Aprovação</b> — indicadores de quão rápido os planos são decididos;",
    "<b>OMs Envolvidas</b> e <b>Usuários</b> — quantas unidades e pessoas estão cadastradas no sistema.",
]))
story.append(img("01-dashboard-kpis.jpg", "Cartões de resumo no topo do Dashboard."))
story.append(Paragraph(
    "Mais abaixo, gráficos mostram a evolução mensal de gastos, a distribuição de planos "
    "por status e o total gasto por Classe de Suprimento — úteis para identificar rapidamente "
    "onde está concentrado o orçamento.", styles["Body"]))
story.append(img("02-dashboard-graficos.jpg", "Gráficos do painel: evolução mensal, status dos planos e despesas por classe."))

# ============================= 4. MENU =============================
story.append(Paragraph("4. Menu de Navegação", styles["H1"]))
story.append(perfil_tag("Todos os usuários (itens variam por perfil)"))
story.append(Paragraph("No lado esquerdo da tela fica o menu principal, sempre visível. É por ele que você se move entre as áreas do sistema:", styles["Body"]))
story.append(bullets([
    "<b>Dashboard</b> — volta para o painel de resumo;",
    "<b>Operações</b> — lista e gerenciamento das operações militares;",
    "<b>Consulta</b> — artigos de apoio (regulamentos, explicações sobre compras, pregões etc.);",
    "<b>Usuários</b> — gestão de contas de acesso (visível só para quem tem permissão de administrador);",
    "<b>Configurações</b> — ajustes de preços, modelos de despesa, hierarquia de OMs e catálogo de itens (visível só para o Super Admin).",
]))

# ============================= 5. OPERAÇÕES =============================
story.append(PageBreak())
story.append(Paragraph("5. Operações — cadastro e gestão", styles["H1"]))
story.append(perfil_tag("Todos os usuários (criar é restrito a quem tem permissão)"))
story.append(Paragraph("5.1 Lista de Operações", styles["H2"]))
story.append(Paragraph(
    "Aqui ficam todas as operações militares cadastradas. Para cada uma, a tabela mostra "
    "o nome, a OM responsável, o período (datas de início e fim), o efetivo envolvido, "
    "quantas OMs participam e quantos Planos de Trabalho já foram criados. Clicando em "
    "<b>Acessar</b>, você entra no detalhe daquela operação. Também é possível buscar uma "
    "operação pelo nome ou pela OM na caixa de busca.", styles["Body"]))
story.append(img("03-operacoes-lista.jpg", "Lista de Operações cadastradas no sistema."))

story.append(Paragraph("5.2 Criando uma Nova Operação", styles["H2"]))
story.append(Paragraph(
    "No botão <b>+ Nova Operação</b>, preencha nome, efetivo (militares e, se houver, "
    "agentes externos), valor limite total, período (data de início e fim) e, "
    "opcionalmente, a finalidade e a motivação — esses dois últimos campos aparecem "
    "depois no cabeçalho do PDF exportado.", styles["Body"]))
story.append(img("04-nova-operacao-form.jpg", "Formulário de criação de uma nova Operação."))
story.append(nota(
    "uma Operação precisa de pelo menos uma OM participante para ser criada — adicione-a "
    "na própria tela de cadastro, na seção \"OMs Participantes\", antes de clicar em "
    "\"Criar Operação\"."))

story.append(Paragraph("5.3 Detalhe de uma Operação", styles["H2"]))
story.append(Paragraph(
    "Ao acessar uma operação, você vê um resumo no topo (efetivo, período, valor limite "
    "total e quanto já foi utilizado em percentual) e, logo abaixo, a lista de "
    "<b>OMs Participantes</b>: quais unidades estão envolvidas, que tipo de unidade são, "
    "quantas subordinadas têm e qual o valor limite de cada uma.", styles["Body"]))
story.append(img("05-operacao-detalhe-topo.jpg", "Tela de detalhe de uma Operação: resumo e OMs participantes."))
story.append(Paragraph(
    "O botão <b>+ Adicionar OM</b> permite incluir uma nova unidade na operação, "
    "buscando-a pelo nome ou sigla e definindo o valor limite dela. O botão "
    "<b>Hierarquia</b> abre uma janela que organiza visualmente as OMs participantes "
    "dentro da operação, mostrando a relação de subordinação entre elas.", styles["Body"]))
story.append(img("07-modal-hierarquia-oms.jpg", "Janela de Hierarquia: organiza visualmente as OMs dentro da operação."))

story.append(Paragraph("5.4 Planos de Trabalho da Operação", styles["H2"]))
story.append(Paragraph(
    "Mais abaixo na mesma tela fica a seção Planos de Trabalho, com um filtro por tipo: "
    "<b>Logístico</b>, <b>Operacional (GND 3)</b>, <b>Operacional (GND 4)</b>, "
    "<b>Ração (R-2)</b> e <b>Munição</b>. Cada linha da tabela é um plano de uma OM "
    "específica, com título, número da versão, valor total e status (por exemplo "
    "\"Não enviado\", \"Aguardando aprovação\" ou \"Autorizado\"). O botão <b>Abrir</b> "
    "leva ao detalhe daquele plano, onde as despesas são lançadas uma a uma.", styles["Body"]))
story.append(img("06-operacao-planos-trabalho.jpg", "Lista de Planos de Trabalho de uma Operação, por tipo."))

story.append(Paragraph("5.5 Mais ações da Operação (exportar, consolidar, assinar)", styles["H2"]))
story.append(Paragraph(
    "No botão <b>Ações</b>, no topo da tela da Operação, ficam disponíveis: exportar "
    "todos os Planos da Operação em PDF (um documento por tipo, já reunido) ou em uma "
    "planilha Excel consolidada, gerar a DOR (Documento de Oficialização da Requisição), "
    "importar um Plano de Trabalho pronto e assinar tudo no gov.br — veja os capítulos "
    "específicos de cada uma dessas ações mais adiante.", styles["Body"]))

# ============================= 6. PERMISSÕES / OM =============================
story.append(PageBreak())
story.append(Paragraph("6. Quem vê o quê: OMs, hierarquia e permissões", styles["H1"]))
story.append(perfil_tag("Todos os perfis"))
story.append(Paragraph(
    "O SisPTrab organiza o acesso pela <b>hierarquia de Organizações Militares (OMs)</b> "
    "cadastrada em Configurações. Entender essa regra evita confusão sobre por que um "
    "usuário vê (ou não vê) determinada Operação ou Plano de Trabalho.", styles["Body"]))
story.append(Paragraph("6.1 Regra geral", styles["H2"]))
story.append(bullets([
    "Um usuário <b>Integrante</b> ou <b>S4</b> de uma OM enxerga e pode lançar despesas nos "
    "Planos de Trabalho da <b>própria OM</b> e das OMs <b>subordinadas</b> a ela na hierarquia;",
    "Uma OM <b>não</b> enxerga nem pode lançar despesas em Planos de Trabalho de outra OM que "
    "não seja subordinada a ela — por exemplo, o usuário de uma unidade X não vê os Planos de "
    "uma unidade Y que não é subordinada de X, mesmo que ambas participem da mesma Operação;",
    "O <b>Super Admin</b> enxerga e pode agir em qualquer OM do sistema, sem restrição;",
    "A criação de um novo Plano de Trabalho também respeita essa regra: só é possível criar "
    "um Plano em nome da própria OM ou de uma OM subordinada a ela.",
]))
story.append(nota(
    "essa regra é a mesma para toda e qualquer OM do sistema — não existe tratamento especial "
    "para nenhuma unidade específica. Se uma OM não está vendo o que deveria, o primeiro lugar "
    "a conferir é a Hierarquia de OMs em Configurações (capítulo 18.3): provavelmente a relação "
    "de subordinação não está cadastrada corretamente."))
story.append(Paragraph("6.2 Lançando em nome de uma OM subordinada", styles["H2"]))
story.append(Paragraph(
    "É comum que um S4 de um Comando lance o Plano de Trabalho de uma unidade subordinada que "
    "ainda não tem acesso próprio ao sistema. Para isso, na tela da Operação, dentro da janela "
    "de Hierarquia (ou no botão \"Criar Plano\" ao lado de cada OM listada), escolha a OM "
    "subordinada desejada antes de criar o Plano — o título e os dados ficam automaticamente "
    "associados a ela, não à OM de quem está logado.", styles["Body"]))

story.append(Paragraph("6.3 Perfis de acesso: o que cada um pode fazer", styles["H2"]))
story.append(Paragraph(
    "Além da OM e da hierarquia, cada usuário tem uma <b>Permissão (Role)</b> que define "
    "quais ações ele pode realizar no sistema:", styles["Body"]))
perfis = [
    ("Integrante", "Lança despesas, cria Planos de Trabalho e envia para análise, dentro "
                    "da própria OM/subordinadas. Não aprova planos."),
    ("S4", "Tudo que o Integrante faz, mais: aprovar Planos de Trabalho no nível "
           "correspondente da cadeia de aprovação."),
    ("Comandante", "Acesso de visualização ampliado dentro do seu escopo de OM; não "
                    "participa diretamente da cadeia de aprovação de Planos de Trabalho."),
    ("Super Admin", "Acesso irrestrito a todas as OMs e Operações, além das áreas de "
                     "Usuários e Configurações (preços, modelos, hierarquia de OMs e "
                     "catálogo de itens)."),
]
perfis_tbl = Table(
    [[Paragraph("<b>Permissão</b>", styles["Body"]), Paragraph("<b>O que pode fazer</b>", styles["Body"])]] +
    [[Paragraph(f"<b>{p}</b>", styles["Body"]), Paragraph(d, styles["Body"])] for p, d in perfis],
    colWidths=[3 * cm, 12.5 * cm])
perfis_tbl.setStyle(TableStyle([
    ("LINEBELOW", (0, 0), (-1, 0), 0.75, GREEN),
    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, GREEN_LIGHT]),
    ("TOPPADDING", (0, 0), (-1, -1), 6),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ("LEFTPADDING", (0, 0), (-1, -1), 6),
]))
story.append(perfis_tbl)
story.append(Spacer(1, 6))
story.append(nota(
    "a Permissão (Role) é diferente do Cargo/Função (S1, S2, S3, S4...) explicado no "
    "capítulo 17.2 — a Permissão controla o que o sistema deixa fazer; o Cargo é só uma "
    "informação de identificação.", titulo="Não confunda"))

story.append(Paragraph("6.4 O que significa cada status de um Plano de Trabalho", styles["H2"]))
status_tab = [
    ("Rascunho", "O plano ainda está sendo montado; pode ser editado livremente pelo "
                 "responsável, S4 da OM ou Administrador."),
    ("Aguardando análise", "O plano foi enviado e está em algum nível da cadeia de "
                            "aprovação; não pode mais ser editado até haver uma decisão."),
    ("Autorizado", "O plano passou por todos os níveis de aprovação necessários."),
    ("Pendente de correção", "Alguém da cadeia de aprovação devolveu o plano com um "
                              "motivo; o responsável pode corrigir e reenviar."),
]
status_tbl = Table(
    [[Paragraph("<b>Status</b>", styles["Body"]), Paragraph("<b>Significado</b>", styles["Body"])]] +
    [[Paragraph(f"<b>{s}</b>", styles["Body"]), Paragraph(d, styles["Body"])] for s, d in status_tab],
    colWidths=[3.5 * cm, 12 * cm])
status_tbl.setStyle(TableStyle([
    ("LINEBELOW", (0, 0), (-1, 0), 0.75, GREEN),
    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, GREEN_LIGHT]),
    ("TOPPADDING", (0, 0), (-1, -1), 6),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ("LEFTPADDING", (0, 0), (-1, -1), 6),
]))
story.append(status_tbl)

# ============================= 7. TIPOS DE PLANO =============================
story.append(Paragraph("7. Os tipos de Plano de Trabalho", styles["H1"]))
story.append(Paragraph(
    "O SisPTrab tem cinco tipos de Plano de Trabalho, cada um com sua própria tela e "
    "finalidade. A escolha do tipo é feita no momento da criação do Plano:", styles["Body"]))
story.append(Table([[
    Paragraph("<b>Tipo</b>", styles["Body"]), Paragraph("<b>Para quê serve</b>", styles["Body"])
]] + [
    [Paragraph(t, styles["Body"]), Paragraph(d, styles["Body"])] for t, d in [
        ("Logístico", "Apoio contínuo à tropa: alimentação, combustível, material, manutenção de "
                       "viaturas/armamento/equipamentos, saúde etc. — organizado pelas Classes de "
                       "Suprimento I a X."),
        ("Operacional (GND 3)", "Despesas de custeio ligadas diretamente à execução da operação: "
                                 "diárias, passagens, locação de serviços, suprimento de fundos etc."),
        ("Operacional (GND 4)", "Aquisição de equipamentos e material permanente (investimento) "
                                 "ligados à operação."),
        ("Ração (R-2)", "Itens de ração operacional: lançamento por item e quantidade, sem rateio "
                         "de valor em dinheiro — o custo é calculado centralmente pelo COLOG."),
        ("Munição", "Itens de munição (identificados por NEE/NSN): lançamento por item e "
                     "quantidade, sem rateio de valor — o custo também é calculado centralmente."),
    ]
], colWidths=[3.8 * cm, 11.7 * cm]))
story.append(Spacer(1, 10))
story.append(nota(
    "cada Operação pode ter vários Planos de Trabalho de tipos diferentes ao mesmo tempo — por "
    "exemplo, a mesma OM pode ter um Plano Logístico e um Plano de Ração para a mesma Operação, "
    "lançados separadamente."))

# ============================= 8. LOGÍSTICO =============================
story.append(PageBreak())
story.append(Paragraph("8. Plano de Trabalho Logístico (Classes I a X)", styles["H1"]))
story.append(perfil_tag("Integrante, S4, Administrador"))
story.append(Paragraph(
    "Este é o \"coração\" do sistema: a tela onde as despesas de apoio à tropa são "
    "lançadas, organizadas pelas chamadas <b>Classes de Suprimento</b> (de I a X). No "
    "topo da tela aparecem o status do plano (Rascunho, Aguardando análise, Autorizado...), "
    "o responsável e o valor total já lançado.", styles["Body"]))
story.append(img("08-plano-trabalho-detalhe.jpg", "Tela de detalhe de um Plano de Trabalho Logístico."))
story.append(Paragraph("8.1 As dez Classes de Suprimento", styles["H2"]))
classes_tab = [
    ("I", "Material de Subsistência — alimentação (QR/QS)."),
    ("II", "Material de Intendência — fardamento, equipamento individual, material de acampamento e alojamento."),
    ("III", "Combustíveis e Lubrificantes."),
    ("IV", "Material de Construção."),
    ("V", "Armamento e Munição — manutenção de armamento (o consumo de munição em si é lançado no Plano de Munição, separado)."),
    ("VI", "Material de Engenharia e Cartografia — manutenção de equipamentos de engenharia (geradores, embarcações, máquinas pesadas)."),
    ("VII", "Material de Comunicações, Eletrônica e Informática — manutenção de rádios, equipamentos de TI."),
    ("VIII", "Material de Saúde — kits de primeiros socorros e material médico-hospitalar."),
    ("IX", "Material de Motomecanização e de Aviação — manutenção de viaturas."),
    ("X", "Materiais não incluídos nas demais classes."),
]
story.append(Table(
    [[Paragraph("<b>Classe</b>", styles["Body"]), Paragraph("<b>O que cobre</b>", styles["Body"])]] +
    [[Paragraph(c, styles["Body"]), Paragraph(d, styles["Body"])] for c, d in classes_tab],
    colWidths=[2 * cm, 13.5 * cm]))
story.append(Spacer(1, 10))
story.append(Paragraph("8.1.1 Como cada Classe calcula o valor (em linhas gerais)", styles["H2"]))
story.append(Paragraph(
    "Não é preciso decorar nenhuma fórmula para usar o sistema — mas entender a lógica "
    "por trás de cada cálculo ajuda a conferir se o valor faz sentido antes de enviar o "
    "Plano para análise.", styles["Body"]))
calc_expl = [
    ("Classe I — Alimentação", "Valor da etapa de referência (R$ 17,00, dividida em QS "
     "R$ 10,00 e QR R$ 7,00) × efetivo × dias. Em operações, o sistema soma automaticamente "
     "o complemento de 20% previsto para o desgaste físico extra de atividades no terreno."),
    ("Classe II — Intendência", "Custo diário de manutenção por militar (equipamento "
     "individual, material balístico, de acampamento ou de alojamento) × efetivo × dias — "
     "o valor é derivado do preço do item dividido pela vida útil esperada em dias."),
    ("Classe III — Combustível", "Quantidade de viaturas/equipamentos × distância "
     "percorrida (ou horas de uso) ÷ consumo médio (km/litro ou litro/hora) da tabela "
     "oficial — sem nenhuma margem extra somada por cima."),
    ("Classe V — Armamento", "Custo diário de manutenção por item de armamento (calculado "
     "como 8% do valor de referência do item, dividido por 365 dias) × quantidade × dias de "
     "operação."),
    ("Classe VI — Engenharia", "Custo-hora de manutenção de cada equipamento (peças + "
     "serviço) × horas de uso × dias, com uma reserva de 10% somada ao total para "
     "eventualidades."),
    ("Classe VII — Comunicações/Eletrônica", "Custo diário de manutenção, calculado a "
     "partir do valor de aquisição do equipamento e de sua vida útil (20 anos para "
     "material padrão, 10 anos para material crítico) × quantidade × dias."),
    ("Classe VIII — Saúde", "Quantidade de kits/materiais × custo unitário, com uma "
     "reserva de 20% somada ao total para eventualidades."),
    ("Classe IX — Viaturas", "Custo diário de manutenção por grupo de viatura (percentual "
     "do valor de referência do veículo, variando por categoria e peso) × quantidade × "
     "dias, mais o custo de acionamento a cada 30 dias quando aplicável."),
]
for titulo, texto in calc_expl:
    story.append(Paragraph(f"<b>{titulo}.</b> {texto}", styles["Body"]))
story.append(nota(
    "todos esses valores de referência (preço por item, consumo por km, vida útil etc.) "
    "vêm da Diretriz de Prontidão Logística do COLOG e ficam configuráveis pelo "
    "Administrador em Configurações > Preços (capítulo 18.1) — o usuário comum nunca "
    "precisa digitá-los manualmente."))

story.append(Paragraph("8.2 Lançando uma despesa", styles["H2"]))
story.append(numered([
    "Clique em <b>+ Nova Despesa</b> e escolha a Classe correspondente.",
    "Preencha o formulário específico daquela Classe — cada uma tem seus próprios campos "
    "(tipo de viatura, item de saúde, equipamento de engenharia etc.).",
    "O sistema calcula o valor automaticamente sempre que possível, usando as tabelas "
    "oficiais de referência (ex.: custo de manutenção por dia de uso, consumo de "
    "combustível por km rodado) — você só revisa o resultado antes de salvar.",
    "Defina o rateio entre OMs (para qual unidade o gasto se destina) e entre Naturezas "
    "de Despesa (ND 33.90.30 — material de consumo, ou ND 33.90.39 — serviços de terceiros).",
    "Salve a despesa — ela aparece na lista principal do Plano, com a memória de cálculo "
    "já pronta para conferência.",
]))
story.append(img("09-modal-nova-despesa-logistica.jpg", "Primeiro passo: escolher a Classe da despesa."))
story.append(img("10-formulario-classeIII-combustivel.jpg", "Exemplo de cálculo automático: despesa de combustível (Classe III)."))
story.append(nota(
    "alguns cálculos incluem uma <b>reserva obrigatória</b> sobre o valor total — 10% na "
    "Classe VI (Engenharia) e 20% na Classe VIII (Saúde) — para cobrir eventualidades e "
    "mudanças de escopo durante a operação, conforme a Diretriz de Prontidão Logística. "
    "Essa reserva já vem somada automaticamente, não precisa ser calculada à parte."))

story.append(Paragraph("8.3 Entrada Rápida (lançamento em lote)", styles["H2"]))
story.append(Paragraph(
    "Para quem já tem uma lista de despesas prontas (por exemplo, copiando de uma "
    "planilha antiga), o botão <b>Entrada Rápida</b> abre uma tabela onde várias "
    "despesas simples podem ser digitadas e salvas de uma vez, sem abrir um formulário "
    "por despesa.", styles["Body"]))
story.append(img("11-modal-entrada-rapida-blotter.jpg", "Entrada Rápida: lançamento de várias despesas em formato de tabela."))

story.append(Paragraph("8.4 Rateio entre OMs — \"OM Responsável\" nunca muda", styles["H2"]))
story.append(Paragraph(
    "Uma mesma despesa pode ser paga por uma OM diferente da OM que a utiliza (por exemplo, "
    "o 6º BEC compra combustível, mas parte dele é destinada a outra unidade apoiada). Ao "
    "definir o rateio de uma despesa, você escolhe a <b>OM destino</b> (quem usa/recebe) e "
    "a <b>OM compradora</b> (quem empenha/paga) — elas podem ser diferentes.", styles["Body"]))
story.append(nota(
    "em qualquer documento gerado (PDF, Excel), a etiqueta \"OM RESPONSÁVEL\" sempre se "
    "refere à OM <b>titular do Plano de Trabalho</b> — ou seja, a OM que criou e é dona "
    "daquele Plano — mesmo que alguma despesa dentro dele tenha sido rateada para outra OM "
    "destino ou compradora. Isso vale para qualquer OM do sistema, sem exceção.",
    titulo="Regra importante"))

story.append(Paragraph("8.5 Exportando e outras ações do Plano", styles["H2"]))
story.append(Paragraph(
    "No botão <b>Mais ações</b>, no topo da tela do plano, estão disponíveis: exportar o "
    "plano em PDF ou em planilha Excel (XLSX), importar despesas a partir de uma planilha "
    "já preenchida, e enviar o documento para assinatura digital pelo gov.br.", styles["Body"]))
story.append(img("12-menu-mais-acoes-exportar.jpg", "Menu \"Mais ações\": exportar, importar e assinar o plano."))
story.append(Paragraph(
    "Já o botão verde <b>Enviar para Análise</b> encaminha o plano para a cadeia de "
    "aprovação — a partir daí, outra pessoa (geralmente o S4 do escalão superior) passa a "
    "poder aprovar ou devolver o plano para correção (veja o capítulo 13).", styles["Body"]))

# ============================= 9. OPERACIONAL =============================
story.append(PageBreak())
story.append(Paragraph("9. Plano de Trabalho Operacional (GND 3 e GND 4)", styles["H1"]))
story.append(perfil_tag("Integrante, S4, Administrador"))
story.append(Paragraph(
    "Enquanto o Plano Logístico cuida do apoio contínuo à tropa, o Plano Operacional trata "
    "das despesas específicas da execução da operação em si — como diárias de deslocamento, "
    "passagens aéreas/rodoviárias, contratação de serviços e aquisição de equipamentos. "
    "Essas despesas são classificadas em <b>GND 3</b> (custeio) ou <b>GND 4</b> "
    "(investimento/equipamentos).", styles["Body"]))
story.append(img("13-operacional-gnd3-e-anexos.jpg", "Tela de um Plano de Trabalho Operacional, com despesas de diárias, passagens etc."))
story.append(Paragraph(
    "Ao criar uma nova despesa operacional, você pode partir de um <b>modelo pré-pronto</b> "
    "(cadastrado pelo Administrador em Configurações) — por exemplo \"Diária\", \"Passagem "
    "Aérea/Rodoviária\", \"Serviço de Lavanderia\", \"Equipamento de Proteção Individual\" — "
    "que já vem com objeto, objetivo, finalidade e um roteiro de memória de cálculo prontos "
    "para você só preencher os números específicos da sua operação.", styles["Body"]))
story.append(img("14-plano-despesa-operacional.jpg", "Lista de despesas de um Plano Operacional."))
story.append(img("15-modal-nova-despesa-operacional.jpg", "Formulário de nova despesa operacional, com modelo pré-preenchido."))
story.append(nota(
    "o campo de Natureza de Despesa (ND) nesse tipo de plano cobre todos os códigos usados "
    "pela Diretriz de Custeio: 33.90.15 (diárias), 33.90.30 (material de consumo), 33.90.33 "
    "(passagens), 33.90.39 (serviços de terceiros), 33.90.40 (TI) e 44.90.52 (equipamentos "
    "permanentes, só em GND 4)."))

# ============================= 10. RAÇÃO =============================
story.append(Paragraph("10. Plano de Trabalho de Ração Operacional (R-2)", styles["H1"]))
story.append(perfil_tag("Integrante, S4, Administrador"))
story.append(Paragraph(
    "Este Plano serve exclusivamente para lançar a necessidade de <b>Ração Operacional "
    "(R2-A/91)</b> — e eventuais itens complementares — por OM, item e quantidade, sem "
    "nenhum valor em dinheiro: o custo é calculado centralmente pelo COLOG, então aqui "
    "você só precisa informar o que e quanto é necessário.", styles["Body"]))
story.append(numered([
    "Abra o Plano de tipo \"Ração (R-2)\" da sua OM dentro da Operação (ou crie um novo, "
    "se ainda não existir);",
    "Clique em <b>+ Novo Item</b>;",
    "Escolha o item no catálogo (ex.: \"Ração Operacional (R2-A/91)\") — se o item que você "
    "precisa não estiver na lista, pode digitar livremente;",
    "Informe a quantidade e, se quiser, uma memória de cálculo (ex.: \"80 militares x 3 "
    "dias = 240 rações\");",
    "Salve — o item aparece na lista, com o total geral de quantidade somado ao final.",
]))
story.append(nota(
    "o catálogo de itens de Ração é administrado em Configurações pelo Super Admin "
    "(capítulo 18.4) — ele pode cadastrar novos itens para aparecerem como opção pronta "
    "para todas as OMs."))

# ============================= 11. MUNIÇÃO =============================
story.append(Paragraph("11. Plano de Trabalho de Munição", styles["H1"]))
story.append(perfil_tag("Integrante, S4, Administrador"))
story.append(Paragraph(
    "Funciona de forma muito parecida com o Plano de Ração, mas para itens de munição, "
    "identificados pelo código <b>NEE/NSN</b> (Número de Estoque do Exército / NATO Stock "
    "Number) e pelo tipo de munição.", styles["Body"]))
story.append(numered([
    "Abra o Plano de tipo \"Munição\" da sua OM;",
    "Clique em <b>+ Novo Item</b>;",
    "Escolha o item no catálogo (ex.: \"Mun 5,56mm\", \"Cal 12 CH3T\", itens menos letais "
    "como \"Car Cal 12 Proj Borracha Precision\") — ou digite livremente se o item não "
    "estiver listado;",
    "Informe NEE/NSN (se souber), quantidade e memória de cálculo;",
    "Salve — o total geral de quantidade aparece ao final da lista.",
]))
story.append(nota(
    "pela Diretriz de Prontidão Logística, só deve ser solicitada no Plano de Munição a "
    "quantidade que <b>excede</b> a Dotação de Munição Anual (DMA) já recebida pela OM — "
    "não lance aqui munição que já está em estoque na unidade. Fique atento também ao prazo "
    "de validade: munição menos letal, depois de retirada do invólucro lacrado, passa a ter "
    "validade de apenas 6 meses.", titulo="Atenção"))

# ============================= 12. IMPORTAR =============================
story.append(PageBreak())
story.append(Paragraph("12. Importando um Plano de Trabalho pronto", styles["H1"]))
story.append(perfil_tag("Integrante, S4, Administrador"))
story.append(Paragraph(
    "Se sua OM já tem um Plano de Trabalho pronto em planilha (no modelo padrão do "
    "Exército) ou em PDF, não é necessário digitar tudo de novo: use o botão "
    "<b>Importar P Trab</b>, disponível tanto na tela da Operação quanto no menu "
    "\"Mais ações\" de um Plano já criado.", styles["Body"]))
story.append(Paragraph("12.1 Formatos aceitos", styles["H2"]))
story.append(bullets([
    "<b>.xlsx</b> — Excel moderno (recomendado, maior taxa de reconhecimento);",
    "<b>.xls</b> — Excel antigo (formato binário);",
    "<b>.ods</b> — planilha do LibreOffice/OpenOffice (OpenDocument);",
    "<b>.pdf</b> — extração de texto, com reconhecimento mais limitado que os formatos de planilha.",
]))
story.append(Paragraph("12.2 Importação de arquivo consolidado (várias OMs)", styles["H2"]))
story.append(Paragraph(
    "É comum um Comando receber um arquivo único já consolidado, com os lançamentos de "
    "<b>várias OMs diferentes</b> misturados (em abas separadas ou na mesma aba, cada "
    "linha identificando sua própria OM na coluna \"OM (UGE)\"). O sistema reconhece isso "
    "automaticamente: <b>cada OM identificada no arquivo ganha o seu próprio Plano de "
    "Trabalho</b>, sem que você precise separar o arquivo manualmente antes de importar.",
    styles["Body"]))
story.append(numered([
    "Clique em <b>Importar P Trab</b>;",
    "Informe a origem do documento (ex.: \"E-mail da 3ª Bda Inf Mtz, 10/11/2026\") — isso "
    "fica registrado para referência futura;",
    "Escolha o Tipo do Plano (Logístico, Operacional GND 3 ou GND 4) — arquivos mistos "
    "exigem uma importação por tipo;",
    "Escolha a OM padrão — usada apenas para linhas cuja OM não for reconhecida entre as "
    "participantes da Operação;",
    "Selecione o arquivo e clique em <b>Importar</b>.",
]))
story.append(Paragraph(
    "Ao final, o sistema mostra quantos Planos foram criados e quantas despesas foram "
    "reconhecidas, além de avisos sobre linhas ou abas que não puderam ser interpretadas "
    "(por exemplo, abas de resumo/total ou linhas fora do padrão esperado) — sempre vale "
    "conferir os Planos gerados antes de enviá-los para análise.", styles["Body"]))
story.append(nota(
    "o reconhecimento automático depende do arquivo seguir a estrutura do modelo oficial "
    "(coluna de OM/UGE, colunas de Natureza de Despesa, coluna de Detalhamento/Memória de "
    "Cálculo). Arquivos fora desse padrão, ou abas antigas de operações anteriores dentro do "
    "mesmo arquivo, podem gerar avisos ou exigir revisão manual depois da importação."))

# ============================= 13. APROVAÇÃO =============================
story.append(Paragraph("13. Enviando para Análise e a Cadeia de Aprovação", styles["H1"]))
story.append(perfil_tag("Integrante/S4 (enviar) · S4/Admin (aprovar)"))
story.append(Paragraph(
    "Depois de lançadas todas as despesas de um Plano, o responsável clica em "
    "<b>Enviar para Análise</b>. A partir daí, o plano fica bloqueado para edição e entra "
    "na <b>cadeia de aprovação</b>: cada nível da hierarquia de OM acima da OM titular do "
    "plano precisa aprovar, em sequência, até chegar ao nível final.", styles["Body"]))
story.append(Paragraph(
    "Quem tem permissão de aprovar vê o plano na lista de \"Pendentes de Aprovação\" e "
    "pode <b>Aprovar</b> (passa para o próximo nível, ou autoriza definitivamente se for o "
    "último) ou <b>Reprovar/Devolver</b> com um motivo — nesse caso o plano volta para o "
    "status \"Pendente de Correção\" e o responsável original pode editá-lo e reenviar.",
    styles["Body"]))
story.append(Paragraph(
    "O histórico completo de aprovações (quem aprovou, quando, e os motivos de eventuais "
    "devoluções) fica sempre visível na tela do Plano, dando rastreabilidade total ao "
    "processo.", styles["Body"]))

story.append(Paragraph("13.1 Checklist antes de enviar para análise", styles["H2"]))
story.append(Paragraph(
    "Como o plano fica bloqueado para edição assim que é enviado, vale conferir estes "
    "pontos antes de clicar em \"Enviar para Análise\":", styles["Body"]))
story.append(bullets([
    "O valor total do Plano está dentro do valor limite definido para a OM na Operação?",
    "Cada despesa tem uma memória de cálculo clara, que qualquer pessoa de fora "
    "conseguiria entender e conferir?",
    "O rateio de OMs e de Naturezas de Despesa soma exatamente 100% em cada despesa?",
    "Os itens de Munição lançados correspondem apenas ao que excede a Dotação de Munição "
    "Anual (DMA) já em estoque na OM?",
    "O título do Plano identifica claramente a OM e o tipo de plano (o sistema já sugere "
    "um título automático, mas pode ser editado)?",
    "Se o Plano foi importado de uma planilha, os avisos da importação foram revisados e "
    "nenhuma despesa importante ficou de fora?",
]))

# ============================= 14. ASSINAR GOV.BR =============================
story.append(Paragraph("14. Assinando no gov.br", styles["H1"]))
story.append(perfil_tag("Quem tem permissão de exportar o plano"))
story.append(Paragraph(
    "Depois que o(s) Plano(s) de uma Operação estão prontos, a opção <b>Assinar no "
    "gov.br</b> gera um único arquivo PDF reunindo todos os tipos de plano presentes "
    "(Logístico, Operacional, Ração e Munição, cada um em sua própria seção/página) e "
    "abre o portal de assinatura digital do governo em uma nova aba.", styles["Body"]))
story.append(numered([
    "No menu \"Mais ações\" (de um plano) ou \"Ações\" (da Operação), escolha "
    "<b>Assinar no gov.br</b>;",
    "Informe o posto/graduação, nome e função de quem vai assinar — não precisa ser "
    "necessariamente o responsável que preencheu o plano;",
    "Se houver mais de uma OM, é possível escolher a ordem em que elas aparecem no "
    "documento final;",
    "Clique em <b>Exportar e Assinar</b> — o PDF é baixado automaticamente e o portal "
    "assinador.iti.br abre em uma nova aba;",
    "No portal gov.br, faça o upload manual do arquivo baixado e conclua a assinatura "
    "digital.",
]))
story.append(nota(
    "o arquivo final sempre inclui, em um único PDF, todos os tipos de plano que existirem "
    "na Operação (ou no conjunto de OMs selecionado) — isso evita ter vários arquivos "
    "separados para assinar um por um."))

# ============================= 15. ANEXOS =============================
story.append(PageBreak())
story.append(Paragraph("15. Documentos Assinados da Operação (PTrab e DOR)", styles["H1"]))
story.append(perfil_tag("Todos os usuários (visualizar) · quem tem permissão (enviar)"))
story.append(Paragraph(
    "No final da página da Operação existem duas caixas — <b>PTrab assinado</b> e "
    "<b>DOR assinado</b> — para anexar o Plano de Trabalho e o Documento de Oficialização "
    "da Requisição já assinados (por exemplo, assinados digitalmente pelo gov.br), "
    "guardando-os junto da operação como comprovante oficial.", styles["Body"]))
story.append(nota(
    "isso é diferente de \"Enviar para Análise\" — aqui você está apenas anexando o arquivo "
    "PDF já assinado como registro, não solicitando aprovação."))
story.append(img("23-anexos-ptrab-dor-assinado.jpg", "Área para enviar os PDFs assinados de PTrab e DOR."))

# ============================= 16. CONSULTA =============================
story.append(Paragraph("16. Consulta — biblioteca de referência", styles["H1"]))
story.append(perfil_tag("Todos os usuários (edição pode ser restrita)"))
story.append(Paragraph(
    "A área de Consulta funciona como uma pequena biblioteca interna, com artigos "
    "explicando regras e procedimentos usados no dia a dia de quem monta planos de "
    "trabalho: como funciona o ComprasNET, como fazer pesquisa de preços, o que diz a "
    "nova Lei de Licitações, como identificar as Classes de Suprimento, entre outros "
    "temas. Os artigos podem ser filtrados por categoria (Pregões, ComprasNET, "
    "Regulamentos, Outro) ou localizados pela busca.", styles["Body"]))
story.append(img("16-consulta-lista.jpg", "Lista de artigos da biblioteca de Consulta."))
story.append(img("17-consulta-artigo-detalhe.jpg", "Detalhe de um artigo de Consulta."))

# ============================= 17. USUÁRIOS =============================
story.append(Paragraph("17. Usuários — administração de acessos", styles["H1"]))
story.append(perfil_tag("Apenas Administrador do Sistema"))
story.append(Paragraph(
    "Nesta tela, o Administrador consegue ver todas as pessoas cadastradas no sistema, a "
    "OM de cada uma, o nível de permissão (Integrante, S4 ou Super Admin) e se a conta "
    "está ativa. É possível buscar por nome, e-mail ou OM, e também desativar o acesso de "
    "alguém que não deve mais usar o sistema.", styles["Body"]))
story.append(img("18-usuarios-lista.jpg", "Lista de usuários cadastrados no sistema."))
story.append(Paragraph("17.1 Criando um novo usuário", styles["H2"]))
story.append(Paragraph(
    "O botão <b>+ Novo Usuário</b> abre um formulário com: e-mail, senha inicial, nome "
    "completo, nome de guerra, posto/graduação, telefone, permissão (Role) e Organização "
    "Militar.", styles["Body"]))
story.append(img("19-modal-novo-usuario.jpg", "Formulário de cadastro de novo usuário."))
story.append(Paragraph("17.2 Cargo/Função (S1, S2, S3, S4...)", styles["H2"]))
story.append(Paragraph(
    "Além da <b>Permissão</b> (que controla o que o usuário pode fazer no sistema: "
    "Integrante, S4, Comandante ou Super Admin), o cadastro tem um campo separado chamado "
    "<b>Cargo/Função</b>, só informativo — ele aparece junto do nome do usuário em "
    "diversas telas, mas não altera nenhuma permissão. As opções incluem: Comandante, "
    "Subcomandante, S1 — Pessoal, S2 — Inteligência, S3 — Operações, S4 — Logística, "
    "Fiscal Administrativo, Ajudante-Geral, Chefe de Seção e Outro.", styles["Body"]))
story.append(nota(
    "um usuário com a Permissão \"Integrante\", por exemplo, pode ter o Cargo \"S1\" ou "
    "\"S3\" sem que isso mude o que ele pode fazer no sistema — permissão e cargo são "
    "coisas diferentes."))

# ============================= 18. CONFIGURAÇÕES =============================
story.append(PageBreak())
story.append(Paragraph("18. Configurações (apenas Administrador)", styles["H1"]))
story.append(perfil_tag("Apenas Administrador do Sistema"))
story.append(Paragraph(
    "Esta área reúne tudo o que o Administrador pode ajustar sem precisar mexer em "
    "código — valores de referência, modelos de texto e listas que o sistema usa nos "
    "cálculos e formulários.", styles["Body"]))

story.append(Paragraph("18.1 Preços", styles["H2"]))
story.append(Paragraph(
    "Aqui ficam os valores usados pelo sistema nos cálculos automáticos das despesas "
    "logísticas — por exemplo, o valor da etapa de ração (QR/QS), o fator de margem usado "
    "em combustível, quanto custa por dia um capacete, um colete, uma barraca de campanha, "
    "entre outros itens das Classes II, III, V, VI, VII, VIII e IX. Se um item não tiver um "
    "valor configurado aqui, o sistema usa o valor padrão da Diretriz de Prontidão "
    "Logística já embutido internamente. Alterar esses números aqui muda automaticamente "
    "os cálculos que aparecem para todos os usuários.", styles["Body"]))
story.append(img("20-config-precos.jpg", "Tela de Configurações > Preços."))

story.append(Paragraph("18.2 Despesa Operacional (modelos)", styles["H2"]))
story.append(Paragraph(
    "Aqui o Administrador cadastra os <b>modelos (rascunhos)</b> de despesa operacional "
    "que aparecem como opção pronta ao criar uma nova despesa em um Plano Operacional — "
    "cada modelo já vem com objeto, objetivo, finalidade e um roteiro de memória de "
    "cálculo prontos, para o usuário só ajustar os números específicos. A lista oficial "
    "inclui 20 modelos, cobrindo desde Diárias e Passagens até Serviço de Lavanderia, "
    "Serviço Gráfico, Equipamento de Proteção Individual, Água e Esgoto, Material de "
    "Sinalização e Pilhas e Baterias.", styles["Body"]))
story.append(img("21-config-despesa-operacional.jpg", "Configurações de modelos de Despesa Operacional (GND 3)."))

story.append(Paragraph("18.3 Hierarquia de OMs", styles["H2"]))
story.append(Paragraph(
    "Define a relação de subordinação entre as Organizações Militares cadastradas no "
    "sistema — essa é a hierarquia usada tanto para decidir quem vê e pode lançar "
    "despesas em qual OM (capítulo 6), quanto para montar a cadeia de aprovação dinâmica "
    "de cada Plano de Trabalho (capítulo 13). Manter essa árvore correta e atualizada é "
    "essencial para o funcionamento correto das permissões.", styles["Body"]))
story.append(img("22-modal-adicionar-om.jpg", "Janela de adicionar uma nova OM ao sistema."))

story.append(Paragraph("18.4 Catálogo de Itens (Munição e Ração)", styles["H2"]))
story.append(Paragraph(
    "Nesta tela o Administrador cadastra os itens de <b>Munição</b> e de <b>Ração</b> que "
    "aparecem como opção pronta ao lançar um item nos respectivos Planos de Trabalho "
    "(capítulos 10 e 11) — o usuário continua podendo digitar um item livre, fora do "
    "catálogo, se precisar. O sistema já vem com o catálogo inicial de munição da Lista "
    "nº 3 da Diretriz de Prontidão Logística (armamento leve, pesado e munição menos "
    "letal) e a nomenclatura oficial da Ração Operacional (R2-A/91), mas o Administrador "
    "pode adicionar, editar ou remover itens livremente a qualquer momento.", styles["Body"]))
story.append(numered([
    "Acesse Configurações > Catálogo de Itens;",
    "Escolha a aba Munição ou Ração;",
    "Clique em + Novo Item;",
    "Para Munição, preencha NEE/NSN e Tipo; para Ração, preencha o nome do item;",
    "Salve — o item passa a aparecer imediatamente como opção para todas as OMs.",
]))

# ============================= 19. EXEMPLO COMPLETO =============================
story.append(PageBreak())
story.append(Paragraph("19. Exemplo prático completo, do início ao fim", styles["H1"]))
story.append(Paragraph(
    "Este capítulo mostra um exemplo fictício completo, do zero até a assinatura, para "
    "fixar o fluxo inteiro de uma vez. Os números são apenas ilustrativos.", styles["Body"]))

story.append(Paragraph("19.1 Cenário", styles["H2"]))
story.append(Paragraph(
    "O 6º Batalhão de Engenharia de Construção (6º BEC) vai empregar 80 militares por 15 "
    "dias numa operação de apoio à infraestrutura. O S4 do batalhão precisa montar o "
    "Plano de Trabalho Logístico e o Plano de Ração dessa participação.", styles["Body"]))

story.append(Paragraph("19.2 Passo a passo", styles["H2"]))
story.append(numered([
    "O Comando responsável já criou a Operação \"Operação Exemplo 2026\" e adicionou o "
    "6º BEC como OM participante, com um valor limite de R$ 150.000,00;",
    "O S4 do 6º BEC entra no sistema, abre a Operação e clica em \"Criar Plano\" ao lado "
    "do 6º BEC, escolhendo o tipo \"Logístico\";",
    "No Plano recém-criado, lança uma despesa de Classe I (QS): efetivo 80 militares, "
    "situação de pedido até 22 dias — o sistema calcula automaticamente "
    "80 × R$ 2,00 (20% de R$ 10,00) × 15 dias = <b>R$ 2.400,00</b>;",
    "Lança também a Classe III (combustível), informando as viaturas empregadas e a "
    "quilometragem diária prevista — o sistema calcula os litros necessários a partir da "
    "tabela oficial de consumo médio por viatura, sem nenhuma margem extra somada por "
    "cima (a Diretriz 2026 não prevê fator de segurança adicional para combustível);",
    "Confere o rateio: toda a despesa fica 100% para o próprio 6º BEC (OM destino = OM "
    "compradora = 6º BEC) — não há necessidade de dividir com outra unidade neste "
    "exemplo;",
    "Repete o processo para as demais despesas previstas (Classe IX para manutenção de "
    "viaturas, Classe VIII para material de saúde etc.);",
    "Cria também um Plano de tipo \"Ração (R-2)\" para o 6º BEC e lança o item \"Ração "
    "Operacional (R2-A/91)\", quantidade 80 × 15 = 1.200 rações;",
    "Confere o valor total do Plano Logístico no topo da tela e clica em \"Enviar para "
    "Análise\";",
    "O S4 do Comando superior recebe o plano na fila de pendentes, revisa e aprova;",
    "Com o plano Autorizado, o S4 do 6º BEC volta à Operação, clica em \"Assinar no "
    "gov.br\", informa o nome e posto da autoridade assinante e confirma — o PDF "
    "consolidado (Logístico + Ração, cada um em sua seção) é baixado e o portal de "
    "assinatura abre automaticamente;",
    "Depois de assinado no gov.br, o PDF final é anexado de volta na Operação, na caixa "
    "\"PTrab assinado\".",
]))
story.append(nota(
    "repare que, em nenhum momento desse fluxo, foi preciso saber de cor nenhuma fórmula "
    "ou valor de referência — o sistema aplicou sozinho os parâmetros da Diretriz de "
    "Prontidão Logística 2026 em cada cálculo."))

# ============================= 20. GLOSSÁRIO =============================
story.append(PageBreak())
story.append(Paragraph("20. Glossário de termos e siglas", styles["H1"]))
story.append(Paragraph(
    "Lista de termos e siglas usados no sistema, para quem ainda não está familiarizado "
    "com o vocabulário logístico do Exército.", styles["Body"]))
glossario = [
    ("OM", "Organização Militar — qualquer unidade do Exército (batalhão, companhia, "
           "comando, etc.) cadastrada no sistema."),
    ("UGE / CODUG", "Unidade Gestora Executora / Código da Unidade Gestora — identifica "
                     "financeiramente a OM responsável por empenhar (pagar) uma despesa."),
    ("P Trab / Ptrab", "Plano de Trabalho — o documento (e, no sistema, a tela) que "
                        "detalha as despesas previstas para uma Operação."),
    ("DOR", "Documento de Oficialização da Requisição — resume as demandas financeiras "
            "planejadas nos Planos de Trabalho para solicitação formal de recursos."),
    ("GND", "Grupo de Natureza de Despesa — GND 3 é despesa de custeio (consumo, "
            "serviços); GND 4 é despesa de investimento (bens permanentes, equipamentos)."),
    ("ND", "Natureza de Despesa — a classificação contábil de um gasto específico (ex.: "
           "33.90.30 para material de consumo, 33.90.39 para serviços de terceiros)."),
    ("Classe de Suprimento (I a X)", "A categoria do material ou serviço dentro do Plano "
                                      "Logístico — alimentação, combustível, munição, "
                                      "material de saúde etc. (veja a tabela do capítulo 8.1)."),
    ("QR / QS", "Quantitativo de Rancho / Quantitativo de Subsistência — os dois valores "
                "de referência, por militar e por dia, usados para calcular o custo da "
                "alimentação da tropa."),
    ("MEM", "Material de Emprego Militar — o bem físico (viatura, arma, equipamento) "
            "usado como referência de valor para calcular custos de manutenção."),
    ("SMEM", "Sistema de Material de Emprego Militar — o conjunto de MEM de uma OM."),
    ("Rateio", "A divisão de uma despesa entre mais de uma OM e/ou entre mais de uma "
               "Natureza de Despesa, informando o percentual de cada parte."),
    ("OM destino", "A OM que efetivamente recebe ou usa o recurso de uma despesa "
                    "específica dentro de um Plano."),
    ("OM compradora", "A OM (UGE) que empenha/paga uma despesa — pode ser diferente da "
                       "OM destino."),
    ("OM Responsável / OM titular", "A OM dona do Plano de Trabalho como um todo — não "
                                     "muda mesmo que despesas individuais sejam rateadas "
                                     "para outras OMs destino/compradoras."),
    ("Cadeia de aprovação", "A sequência de níveis hierárquicos que precisam aprovar um "
                             "Plano de Trabalho, do responsável que enviou até o nível "
                             "final de autorização."),
    ("DMA", "Dotação de Munição Anual — o quantitativo de munição já previsto para a OM "
            "no ano; só o excedente a isso deve ser lançado no Plano de Munição."),
    ("COLOG", "Comando Logístico — órgão do Exército que emite a Diretriz de Prontidão "
              "Logística e consolida as necessidades orçamentárias."),
    ("COTER", "Comando de Operações Terrestres — órgão responsável por orientar o "
              "preparo e o emprego da Força Terrestre, e por analisar e repassar os P "
              "Trab e DOR ao Ministério da Defesa."),
]
glossario_tbl = Table(
    [[Paragraph("<b>Termo</b>", styles["Body"]), Paragraph("<b>Significado</b>", styles["Body"])]] +
    [[Paragraph(f"<b>{t}</b>", styles["Body"]), Paragraph(d, styles["Body"])] for t, d in glossario],
    colWidths=[3.5 * cm, 12 * cm])
glossario_tbl.setStyle(TableStyle([
    ("LINEBELOW", (0, 0), (-1, 0), 0.75, GREEN),
    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, GREEN_LIGHT]),
    ("TOPPADDING", (0, 0), (-1, -1), 5),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ("LEFTPADDING", (0, 0), (-1, -1), 6),
]))
story.append(glossario_tbl)

# ============================= 21. FAQ =============================
story.append(PageBreak())
story.append(Paragraph("21. Dúvidas comuns e solução de problemas", styles["H1"]))

faq = [
    ("Não consigo ver a Operação de outra OM — isso é normal?",
     "Sim, é o comportamento esperado: você só vê Operações e Planos de Trabalho da sua "
     "própria OM e das que são subordinadas a ela. Veja o capítulo 6."),
    ("Esqueci minha senha. O que faço?",
     "Procure o Administrador do Sistema da sua OM — só ele pode criar ou redefinir "
     "acessos. O SisPTrab não tem, por enquanto, recuperação de senha automática por "
     "e-mail."),
    ("Importei um arquivo e algumas linhas não apareceram. Por quê?",
     "Confira os avisos mostrados ao final da importação — normalmente indicam uma aba "
     "cujo cabeçalho não seguiu o modelo esperado, ou linhas de um tipo de Plano diferente "
     "do que foi escolhido na importação (Logístico x Operacional). Reimporte escolhendo o "
     "tipo certo, ou lance manualmente as linhas que faltaram."),
    ("Por que o valor de uma despesa de combustível/viatura mudou depois que o Administrador "
     "alterou algo em Configurações > Preços?",
     "Porque os valores de referência (consumo, custo-hora, valor da etapa) ficam "
     "centralizados em Configurações — qualquer novo lançamento passa a usar o valor "
     "atualizado automaticamente. Despesas já salvas anteriormente não são recalculadas "
     "sozinhas."),
    ("Posso editar um Plano depois de enviado para análise?",
     "Não, enquanto ele estiver \"Aguardando análise\". Se precisar corrigir algo, peça "
     "para quem está aprovando devolver o plano (reprovar com motivo) — ele volta para "
     "\"Pendente de Correção\" e pode ser editado novamente."),
    ("O arquivo da minha OM é .xls ou .ods, o sistema aceita?",
     "Sim — além do .xlsx, o SisPTrab também lê arquivos .xls (Excel antigo) e .ods "
     "(LibreOffice/OpenOffice) na importação de Plano de Trabalho."),
    ("Importei um arquivo consolidado e ele criou vários Planos de uma vez. Isso é um erro?",
     "Não — é o comportamento esperado quando o arquivo traz mais de uma OM: o sistema "
     "separa automaticamente um Plano de Trabalho por OM identificada, em vez de misturar "
     "tudo num só. Veja o capítulo 12.2."),
    ("Minha OM aparece duplicada ou com nome diferente em cada documento exportado. "
     "O que fazer?",
     "O nome usado é sempre o cadastrado na Organização Militar em Configurações > "
     "Hierarquia de OMs. Se a sigla ou o nome estiverem incorretos lá, corrija o cadastro "
     "da OM — a correção se reflete automaticamente em todos os documentos gerados a "
     "partir daquele momento."),
    ("Posso lançar uma despesa para uma OM que não é a minha nem subordinada à minha?",
     "Não. O sistema só permite lançar despesas em Planos de Trabalho da própria OM ou de "
     "uma OM subordinada na hierarquia — é uma regra de segurança para impedir que uma "
     "unidade altere os dados de outra sem relação hierárquica com ela."),
    ("O botão de aprovar não aparece para mim, mas eu deveria poder aprovar esse Plano. "
     "Por quê?",
     "A permissão de aprovar depende tanto da sua Permissão (Role = S4 ou Super Admin) "
     "quanto da posição da sua OM na cadeia de aprovação daquele Plano específico — "
     "confira se o plano já chegou ao nível da sua OM na hierarquia."),
    ("Quantos Planos de Trabalho uma OM pode ter na mesma Operação?",
     "Mais de um, desde que sejam de tipos diferentes (um Logístico, um Operacional, um "
     "de Ração, um de Munição) — ou versões diferentes do mesmo tipo, se um Plano "
     "anterior precisar ser substituído."),
]
for pergunta, resposta in faq:
    story.append(Paragraph(f"<b>P: {pergunta}</b>", styles["Body"]))
    story.append(Paragraph(f"R: {resposta}", styles["Body"]))
    story.append(Spacer(1, 4))

# ============================= 22. RESUMO =============================
story.append(PageBreak())
story.append(Paragraph("22. Resumo final — o caminho normal de uso", styles["H1"]))
story.append(Paragraph("Em poucas palavras, o caminho normal de uso do SisPTrab é:", styles["Body"]))
story.append(numered([
    "Entrar com seu e-mail e senha;",
    "Abrir (ou criar) a Operação correspondente, com as OMs participantes definidas;",
    "Abrir (ou criar) o Plano de Trabalho da sua OM — Logístico, Operacional, Ração ou "
    "Munição, conforme a necessidade;",
    "Lançar as despesas/itens, usando o cálculo automático e os catálogos sempre que "
    "disponíveis — ou importar um arquivo pronto;",
    "Conferir o valor total e Enviar para Análise;",
    "Acompanhar o status do plano (Aguardando, Autorizado) na tela da Operação ou no "
    "Dashboard;",
    "Quando tudo estiver aprovado, exportar e Assinar no gov.br, e anexar os documentos "
    "assinados (PTrab/DOR) na Operação.",
]))
story.append(Spacer(1, 10))
story.append(Paragraph(
    "Em caso de dúvida sobre regras de compras, pregões ou licitações, consulte a área "
    "<b>Consulta</b> (capítulo 16). Em caso de dúvida sobre valores ou modelos de "
    "despesa, procure o Administrador do Sistema da sua OM.", styles["Body"]))
story.append(Spacer(1, 20))
story.append(HRFlowable(width=16 * cm, thickness=0.5, color=colors.HexColor("#999999")))
story.append(Paragraph(
    "SisPTrab — Sistema de Gestão de Planos de Trabalho · Exército Brasileiro",
    ParagraphStyle("FootFinal", parent=styles["Caption"], fontSize=9)))


def on_page(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(colors.HexColor("#888888"))
    canvas.drawString(2 * cm, 1.2 * cm, "SisPTrab — Manual do Usuário")
    canvas.drawRightString(PAGE_W - 2 * cm, 1.2 * cm, f"Página {doc.page}")
    canvas.restoreState()


doc = SimpleDocTemplate(
    OUT, pagesize=A4,
    leftMargin=2 * cm, rightMargin=2 * cm, topMargin=1.8 * cm, bottomMargin=1.8 * cm,
    title="SisPTrab - Manual do Usuário", author="SisPTrab",
)
doc.build(story, onFirstPage=on_page, onLaterPages=on_page)
print("OK:", OUT)
