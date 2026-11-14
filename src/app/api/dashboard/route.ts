import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getTodasOmsSubordinadas } from "@/lib/validators/om-participante";

const CLASSE_LABELS: Record<string, string> = {
  CLASSE_I: "I - Subsistência",
  CLASSE_II: "II - Int. (Manut.)",
  CLASSE_III: "III - Combustíveis",
  CLASSE_IV: "IV - Construção",
  CLASSE_V: "V - Munição/Explosivos",
  CLASSE_VI: "VI - Material Individual",
  CLASSE_VII: "VII - Equip. Principal",
  CLASSE_VIII: "VIII - Saúde",
  CLASSE_IX: "IX - Manut. Viaturas",
  CLASSE_X: "X - Não Classificado",
};

const TIPO_PLANO_LABELS: Record<string, string> = {
  LOGISTICO: "Logístico",
  OPERACIONAL_GND3: "Operacional GND 3",
  OPERACIONAL_GND4: "Operacional GND 4",
  RACAO_R2: "Ração R2",
  MUNICAO: "Munição",
};

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  COMANDANTE: "Comandante",
  S4: "S4",
  INTEGRANTE: "Integrante",
};

const TIPO_EVENTO_LABELS: Record<string, string> = {
  CRIACAO: "Criação",
  ENVIO_ANALISE: "Envio para análise",
  APROVACAO: "Aprovação",
  REPROVACAO: "Reprovação",
  EDICAO: "Edição",
};

function mesLabel(date: Date): string {
  return date.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }).replace(".", "");
}

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: currentUser.userId },
      include: { om: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    const isSuperAdmin = user.role === "SUPER_ADMIN";

    // Escopo de OMs visíveis: SUPER_ADMIN vê tudo; demais veem sua OM + subordinadas.
    let omScopeIds: string[] | null = null;
    if (!isSuperAdmin) {
      const subordinadas = await getTodasOmsSubordinadas(user.omId);
      omScopeIds = [user.omId, ...subordinadas.map((s) => s.id)];
    }

    const operacaoWhere = isSuperAdmin
      ? {}
      : {
          OR: [
            { omId: { in: omScopeIds! } },
            { omsParticipantes: { some: { omId: { in: omScopeIds! } } } },
          ],
        };

    const planoWhere = isSuperAdmin ? {} : { omId: { in: omScopeIds! } };

    const now = new Date();
    const doze_meses_atras = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    const [
      operacoes,
      planos,
      despesas,
      despesasOperacionais,
      aprovacoes,
      atividade,
      usuariosNoEscopo,
      omsNoEscopo,
    ] = await Promise.all([
      prisma.operacao.findMany({
        where: operacaoWhere,
        select: {
          id: true,
          nome: true,
          efetivoMil: true,
          efetivoExt: true,
          dataInicio: true,
          dataFinal: true,
          valorLimiteTotal: true,
          om: { select: { sigla: true } },
        },
      }),
      prisma.planoTrabalho.findMany({
        where: planoWhere,
        select: {
          id: true,
          titulo: true,
          status: true,
          tipo: true,
          valorTotalDespesas: true,
          createdAt: true,
          dataEnvioAnalise: true,
          operacaoId: true,
          om: { select: { id: true, sigla: true, nome: true } },
          operacao: { select: { nome: true } },
        },
      }),
      prisma.despesa.findMany({
        where: { planoTrabalho: planoWhere },
        select: {
          valorCalculado: true,
          createdAt: true,
          classe: { select: { nome: true } },
          despesasNaturezas: {
            select: {
              percentual: true,
              natureza: { select: { codigo: true, nome: true } },
            },
          },
        },
      }),
      prisma.despesaOperacional.findMany({
        where: { planoTrabalho: planoWhere },
        select: {
          createdAt: true,
          naturezas: {
            select: {
              valor: true,
              natureza: { select: { codigo: true, nome: true } },
            },
          },
        },
      }),
      prisma.aprovacaoHistorico.findMany({
        where: { planoTrabalho: planoWhere },
        select: {
          acao: true,
          dataAcao: true,
          planoTrabalho: { select: { dataEnvioAnalise: true, createdAt: true } },
        },
      }),
      prisma.auditoriaLog.findMany({
        where: isSuperAdmin
          ? {}
          : {
              OR: [
                { operacao: operacaoWhere },
                { planoTrabalho: planoWhere },
              ],
            },
        orderBy: { timestamp: "desc" },
        take: 15,
        select: {
          id: true,
          tipoEvento: true,
          descricao: true,
          timestamp: true,
          usuario: { select: { postoGraduacao: true, nomeGuerra: true, nomeCompleto: true } },
          operacao: { select: { nome: true } },
          planoTrabalho: { select: { titulo: true } },
        },
      }),
      isSuperAdmin
        ? prisma.user.count()
        : prisma.user.count({ where: { omId: { in: omScopeIds! } } }),
      isSuperAdmin
        ? prisma.organizacaoMilitar.count()
        : prisma.organizacaoMilitar.count({ where: { id: { in: omScopeIds! } } }),
    ]);

    // ---------- KPIs ----------
    const operacoesAtivas = operacoes.filter((o) => o.dataFinal >= now).length;
    const efetivoTotal = operacoes.reduce(
      (acc, o) => acc + o.efetivoMil + (o.efetivoExt || 0),
      0
    );

    const valorDespesas = despesas.reduce((acc, d) => acc + Number(d.valorCalculado), 0);
    const valorDespesasOperacionais = despesasOperacionais.reduce(
      (acc, d) => acc + d.naturezas.reduce((a, n) => a + Number(n.valor), 0),
      0
    );
    const valorTotalGeral = valorDespesas + valorDespesasOperacionais;

    const aprovadosCount = aprovacoes.filter((a) => a.acao === "APROVADO").length;
    const reprovadosCount = aprovacoes.filter((a) => a.acao === "REPROVADO").length;
    const decididos = aprovadosCount + reprovadosCount;
    const taxaAprovacao = decididos > 0 ? (aprovadosCount / decididos) * 100 : null;

    const temposAprovacao = aprovacoes
      .filter((a) => a.acao === "APROVADO" && a.planoTrabalho.dataEnvioAnalise)
      .map(
        (a) =>
          (a.dataAcao.getTime() - a.planoTrabalho.dataEnvioAnalise!.getTime()) /
          (1000 * 60 * 60 * 24)
      );
    const tempoMedioAprovacaoDias =
      temposAprovacao.length > 0
        ? temposAprovacao.reduce((a, b) => a + b, 0) / temposAprovacao.length
        : null;

    // ---------- Planos por status ----------
    const statusOrdem = ["RASCUNHO", "EM_ANALISE", "APROVADO", "REPROVADO"];
    const planosPorStatus = statusOrdem.map((status) => ({
      status,
      count: planos.filter((p) => p.status === status).length,
    }));

    // ---------- Planos por tipo ----------
    const tiposSet = Array.from(new Set(planos.map((p) => p.tipo)));
    const planosPorTipo = tiposSet.map((tipo) => {
      const doTipo = planos.filter((p) => p.tipo === tipo);
      return {
        tipo,
        label: TIPO_PLANO_LABELS[tipo] || tipo,
        count: doTipo.length,
        valor: doTipo.reduce((acc, p) => acc + Number(p.valorTotalDespesas || 0), 0),
      };
    });

    // ---------- Despesas por Classe ----------
    const classeMap = new Map<string, { count: number; valor: number }>();
    for (const d of despesas) {
      const nome = d.classe.nome;
      const atual = classeMap.get(nome) || { count: 0, valor: 0 };
      atual.count += 1;
      atual.valor += Number(d.valorCalculado);
      classeMap.set(nome, atual);
    }
    const despesasPorClasse = Array.from(classeMap.entries())
      .map(([classe, v]) => ({
        classe,
        label: CLASSE_LABELS[classe] || classe,
        ...v,
      }))
      .sort((a, b) => b.valor - a.valor);

    // ---------- Valor por Natureza de Despesa ----------
    const naturezaMap = new Map<string, { nome: string; valor: number }>();
    for (const d of despesas) {
      const valorDespesa = Number(d.valorCalculado);
      for (const dn of d.despesasNaturezas) {
        const codigo = dn.natureza.codigo;
        const atual = naturezaMap.get(codigo) || { nome: dn.natureza.nome, valor: 0 };
        atual.valor += (valorDespesa * Number(dn.percentual)) / 100;
        naturezaMap.set(codigo, atual);
      }
    }
    for (const d of despesasOperacionais) {
      for (const n of d.naturezas) {
        const codigo = n.natureza.codigo;
        const atual = naturezaMap.get(codigo) || { nome: n.natureza.nome, valor: 0 };
        atual.valor += Number(n.valor);
        naturezaMap.set(codigo, atual);
      }
    }
    const valorPorNatureza = Array.from(naturezaMap.entries())
      .map(([codigo, v]) => ({ codigo, ...v }))
      .sort((a, b) => b.valor - a.valor);

    // ---------- Evolução mensal (últimos 12 meses) ----------
    const meses: { chave: string; label: string; valor: number; planos: number }[] = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
      meses.push({ chave: `${d.getFullYear()}-${d.getMonth()}`, label: mesLabel(d), valor: 0, planos: 0 });
    }
    const mesIndex = new Map(meses.map((m, i) => [m.chave, i]));

    for (const d of despesas) {
      if (d.createdAt < doze_meses_atras) continue;
      const chave = `${d.createdAt.getFullYear()}-${d.createdAt.getMonth()}`;
      const idx = mesIndex.get(chave);
      if (idx !== undefined) meses[idx].valor += Number(d.valorCalculado);
    }
    for (const d of despesasOperacionais) {
      if (d.createdAt < doze_meses_atras) continue;
      const chave = `${d.createdAt.getFullYear()}-${d.createdAt.getMonth()}`;
      const idx = mesIndex.get(chave);
      if (idx !== undefined) {
        meses[idx].valor += d.naturezas.reduce((a, n) => a + Number(n.valor), 0);
      }
    }
    for (const p of planos) {
      if (p.createdAt < doze_meses_atras) continue;
      const chave = `${p.createdAt.getFullYear()}-${p.createdAt.getMonth()}`;
      const idx = mesIndex.get(chave);
      if (idx !== undefined) meses[idx].planos += 1;
    }
    const evolucaoMensal = meses.map(({ chave, ...rest }) => rest);

    // ---------- Top Operações por valor ----------
    const valorPorOperacaoId = new Map<string, number>();
    for (const p of planos) {
      valorPorOperacaoId.set(
        p.operacaoId,
        (valorPorOperacaoId.get(p.operacaoId) || 0) + Number(p.valorTotalDespesas || 0)
      );
    }
    const topOperacoes = operacoes
      .map((o) => ({
        nome: o.nome,
        om: o.om.sigla,
        valor: valorPorOperacaoId.get(o.id) || 0,
      }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 8);

    // ---------- Top OMs por valor (dono do plano) ----------
    const valorPorOm = new Map<string, { sigla: string; valor: number }>();
    for (const p of planos) {
      const atual = valorPorOm.get(p.om.id) || { sigla: p.om.sigla, valor: 0 };
      atual.valor += Number(p.valorTotalDespesas || 0);
      valorPorOm.set(p.om.id, atual);
    }
    const topOMs = Array.from(valorPorOm.values())
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 8);

    // ---------- Usuários por role (só visível de forma agregada) ----------
    const usuariosPorRoleRaw = isSuperAdmin
      ? await prisma.user.groupBy({ by: ["role"], _count: { role: true } })
      : await prisma.user.groupBy({
          by: ["role"],
          _count: { role: true },
          where: { omId: { in: omScopeIds! } },
        });
    const usuariosPorRole = usuariosPorRoleRaw.map((r) => ({
      role: r.role,
      label: ROLE_LABELS[r.role] || r.role,
      count: r._count.role,
    }));

    // ---------- Atividade recente ----------
    const atividadeRecente = atividade.map((a) => ({
      id: a.id,
      tipo: a.tipoEvento,
      tipoLabel: TIPO_EVENTO_LABELS[a.tipoEvento] || a.tipoEvento,
      descricao: a.descricao,
      timestamp: a.timestamp,
      usuario: a.usuario
        ? `${a.usuario.postoGraduacao} ${a.usuario.nomeGuerra || a.usuario.nomeCompleto}`
        : null,
      contexto: a.planoTrabalho?.titulo || a.operacao?.nome || null,
    }));

    return NextResponse.json({
      escopo: isSuperAdmin ? "GLOBAL" : "OM",
      omUsuario: user.om.sigla,
      kpis: {
        totalOperacoes: operacoes.length,
        operacoesAtivas,
        totalPlanos: planos.length,
        valorTotalGeral,
        valorDespesas,
        valorDespesasOperacionais,
        efetivoTotal,
        taxaAprovacao,
        tempoMedioAprovacaoDias,
        totalUsuarios: usuariosNoEscopo,
        totalOMs: omsNoEscopo,
        decisoesTotais: decididos,
        aprovadosCount,
        reprovadosCount,
      },
      planosPorStatus,
      planosPorTipo,
      despesasPorClasse,
      valorPorNatureza,
      evolucaoMensal,
      topOperacoes,
      topOMs,
      usuariosPorRole,
      atividadeRecente,
    });
  } catch (error) {
    console.error("Get dashboard error:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
