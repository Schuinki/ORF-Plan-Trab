"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  ComposedChart,
  Area,
  Line,
} from "recharts";
import {
  Folder,
  FileText,
  Users,
  Building2,
  Wallet,
  Percent,
  Clock,
  ShieldCheck,
  Activity,
  RefreshCw,
} from "lucide-react";

interface DashboardData {
  escopo: "GLOBAL" | "OM";
  omUsuario: string;
  kpis: {
    totalOperacoes: number;
    operacoesAtivas: number;
    totalPlanos: number;
    valorTotalGeral: number;
    valorDespesas: number;
    valorDespesasOperacionais: number;
    efetivoTotal: number;
    taxaAprovacao: number | null;
    tempoMedioAprovacaoDias: number | null;
    totalUsuarios: number;
    totalOMs: number;
    decisoesTotais: number;
    aprovadosCount: number;
    reprovadosCount: number;
  };
  planosPorStatus: { status: string; count: number }[];
  planosPorTipo: { tipo: string; label: string; count: number; valor: number }[];
  despesasPorClasse: { classe: string; label: string; count: number; valor: number }[];
  valorPorNatureza: { codigo: string; nome: string; valor: number }[];
  evolucaoMensal: { label: string; valor: number; planos: number }[];
  topOperacoes: { nome: string; om: string; valor: number }[];
  topOMs: { sigla: string; valor: number }[];
  usuariosPorRole: { role: string; label: string; count: number }[];
  atividadeRecente: {
    id: string;
    tipo: string;
    tipoLabel: string;
    descricao: string;
    timestamp: string;
    usuario: string | null;
    contexto: string | null;
  }[];
}

const PALETTE = [
  "#556647",
  "#b45309",
  "#2563eb",
  "#869b76",
  "#7d8b6f",
  "#dc2626",
  "#44503a",
  "#d97706",
  "#9aa68d",
  "#1d4ed8",
  "#30372a",
  "#a8b89d",
];

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  RASCUNHO: { label: "Não enviado", color: "#9aa68d" },
  EM_ANALISE: { label: "Aguardando", color: "#d97706" },
  APROVADO: { label: "Autorizado", color: "#556647" },
  REPROVADO: { label: "Reprovado", color: "#dc2626" },
};

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatCurrencyCompact(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    return `R$ ${(value / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`;
  }
  if (Math.abs(value) >= 1_000) {
    return `R$ ${(value / 1_000).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} mil`;
  }
  return formatCurrency(value);
}

function truncar(texto: string, tamanho: number): string {
  return texto.length > tamanho ? `${texto.slice(0, tamanho - 1)}…` : texto;
}

function tempoRelativo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `há ${d}d`;
  const mesesAtras = Math.floor(d / 30);
  return `há ${mesesAtras} ${mesesAtras === 1 ? "mês" : "meses"}`;
}

function ChartCard({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-white rounded-lg border border-olive-200 p-4 sm:p-5 ${className}`}>
      <h3 className="text-sm sm:text-base font-semibold text-military-900">{title}</h3>
      {subtitle && <p className="text-xs text-olive-600 mb-2">{subtitle}</p>}
      <div className={subtitle ? "" : "mt-3"}>{children}</div>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-lg border border-olive-200 p-4 flex flex-col gap-2 min-w-0">
      <div className="flex items-center justify-between">
        <span className="text-xs sm:text-sm font-medium text-olive-700 truncate">{label}</span>
        <div className={`p-1.5 rounded-md shrink-0 ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="text-xl sm:text-2xl font-bold text-military-900 break-words leading-tight">
        {value}
      </div>
      {sub && <div className="text-xs text-olive-600">{sub}</div>}
    </div>
  );
}

function CustomTooltipCurrency({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-white border border-olive-300 rounded-md shadow-lg px-3 py-2 text-xs">
      {label && <div className="font-medium text-military-900 mb-1">{label}</div>}
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ color: p.color || p.fill }}>
          {p.name}: {formatCurrency(p.value)}
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [atualizadoEm, setAtualizadoEm] = useState<Date | null>(null);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/dashboard");
      if (res.ok) {
        setData(await res.json());
        setAtualizadoEm(new Date());
      }
    } catch (error) {
      console.error("Erro ao buscar dashboard:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-military-600"></div>
      </div>
    );
  }

  const { kpis } = data;

  const temAtividadeFinanceira = kpis.valorTotalGeral > 0;
  const maxEvolucao = Math.max(1, ...data.evolucaoMensal.map((m) => m.valor));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-military-900 mb-1">Dashboard</h1>
          <p className="text-sm text-olive-700">
            {data.escopo === "GLOBAL"
              ? "Visão geral de todo o sistema SisPTrab"
              : `Visão consolidada da ${data.omUsuario} e OMs subordinadas`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {atualizadoEm && (
            <span className="text-xs text-olive-500">
              Atualizado às{" "}
              {atualizadoEm.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          <button
            onClick={fetchDashboard}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-military-700 bg-military-100 hover:bg-military-200 px-3 py-1.5 rounded-lg transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Atualizar
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard
          icon={Wallet}
          label="Valor Total Movimentado"
          value={formatCurrencyCompact(kpis.valorTotalGeral)}
          sub={`${formatCurrencyCompact(kpis.valorDespesas)} logístico + ${formatCurrencyCompact(kpis.valorDespesasOperacionais)} operacional`}
          color="bg-military-100 text-military-700"
        />
        <KpiCard
          icon={Folder}
          label="Operações"
          value={String(kpis.totalOperacoes)}
          sub={`${kpis.operacoesAtivas} em andamento`}
          color="bg-blue-100 text-blue-700"
        />
        <KpiCard
          icon={FileText}
          label="Planos de Trabalho"
          value={String(kpis.totalPlanos)}
          sub={`${kpis.decisoesTotais} decididos pela aprovação`}
          color="bg-olive-100 text-olive-700"
        />
        <KpiCard
          icon={Users}
          label="Efetivo Mobilizado"
          value={kpis.efetivoTotal.toLocaleString("pt-BR")}
          sub="Militares + agentes externos"
          color="bg-amber-50 text-amber-700"
        />
        <KpiCard
          icon={Percent}
          label="Taxa de Aprovação"
          value={kpis.taxaAprovacao !== null ? `${kpis.taxaAprovacao.toFixed(0)}%` : "—"}
          sub={
            kpis.decisoesTotais > 0
              ? `${kpis.aprovadosCount} autoriz. / ${kpis.reprovadosCount} reprov.`
              : "Sem decisões ainda"
          }
          color="bg-green-100 text-green-700"
        />
        <KpiCard
          icon={Clock}
          label="Tempo Médio p/ Aprovação"
          value={
            kpis.tempoMedioAprovacaoDias !== null
              ? kpis.tempoMedioAprovacaoDias < 1
                ? "< 1 dia"
                : `${kpis.tempoMedioAprovacaoDias.toFixed(1)} dias`
              : "—"
          }
          sub="Da análise até a decisão"
          color="bg-purple-100 text-purple-700"
        />
        <KpiCard
          icon={Building2}
          label="OMs Envolvidas"
          value={String(kpis.totalOMs)}
          sub={data.escopo === "GLOBAL" ? "No sistema" : "No seu escopo"}
          color="bg-military-100 text-military-700"
        />
        <KpiCard
          icon={ShieldCheck}
          label="Usuários"
          value={String(kpis.totalUsuarios)}
          sub={data.escopo === "GLOBAL" ? "Cadastrados no sistema" : "No seu escopo"}
          color="bg-blue-100 text-blue-700"
        />
      </div>

      {!temAtividadeFinanceira ? (
        <div className="bg-white rounded-lg border border-olive-200 p-8 text-center text-olive-600">
          Ainda não há despesas lançadas no seu escopo para gerar os gráficos analíticos.
        </div>
      ) : (
        <>
          {/* Evolução mensal */}
          <ChartCard
            title="Evolução Mensal"
            subtitle="Valor lançado em despesas e novos planos criados, últimos 12 meses"
          >
            <div className="h-64 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data.evolucaoMensal} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e9e2" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#7d8b6f" />
                  <YAxis
                    yAxisId="valor"
                    tickFormatter={(v) => formatCurrencyCompact(v)}
                    tick={{ fontSize: 10 }}
                    stroke="#7d8b6f"
                    width={55}
                  />
                  <YAxis yAxisId="planos" orientation="right" hide />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload || !payload.length) return null;
                      return (
                        <div className="bg-white border border-olive-300 rounded-md shadow-lg px-3 py-2 text-xs space-y-0.5">
                          <div className="font-medium text-military-900">{label}</div>
                          <div className="text-military-700">
                            Valor: {formatCurrency(payload[0]?.payload?.valor || 0)}
                          </div>
                          <div className="text-olive-600">
                            Planos criados: {payload[0]?.payload?.planos || 0}
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Area
                    yAxisId="valor"
                    type="monotone"
                    dataKey="valor"
                    name="Valor"
                    fill="#869b76"
                    stroke="#556647"
                    fillOpacity={0.35}
                  />
                  <Line
                    yAxisId="planos"
                    type="monotone"
                    dataKey="planos"
                    name="Planos criados"
                    stroke="#b45309"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            {maxEvolucao <= 1 && (
              <p className="text-xs text-olive-500 mt-2">
                Dados concentrados no mês corrente — ainda não há histórico suficiente para uma
                tendência mais longa.
              </p>
            )}
          </ChartCard>

          {/* Linha: Status + Classe */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
            <ChartCard
              title="Planos por Status"
              subtitle="Distribuição de todos os planos no seu escopo"
              className="lg:col-span-2"
            >
              <div className="h-56 sm:h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.planosPorStatus.filter((s) => s.count > 0)}
                      dataKey="count"
                      nameKey="status"
                      innerRadius="55%"
                      outerRadius="85%"
                      paddingAngle={2}
                    >
                      {data.planosPorStatus
                        .filter((s) => s.count > 0)
                        .map((s) => (
                          <Cell key={s.status} fill={STATUS_CONFIG[s.status]?.color || "#9aa68d"} />
                        ))}
                    </Pie>
                    <Tooltip
                      formatter={((value: number, _name: unknown, props: any) => [
                        value,
                        STATUS_CONFIG[props.payload.status]?.label || props.payload.status,
                      ]) as any}
                    />
                    <Legend
                      formatter={(value) => STATUS_CONFIG[value]?.label || value}
                      wrapperStyle={{ fontSize: 12 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard
              title="Despesas por Classe de Suprimento"
              subtitle="Valor total lançado em cada Classe (I a X)"
              className="lg:col-span-3"
            >
              <div className="h-64 sm:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.despesasPorClasse}
                    layout="vertical"
                    margin={{ left: 0, right: 16, top: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e9e2" horizontal={false} />
                    <XAxis
                      type="number"
                      tickFormatter={(v) => formatCurrencyCompact(v)}
                      tick={{ fontSize: 10 }}
                      stroke="#7d8b6f"
                    />
                    <YAxis
                      type="category"
                      dataKey="label"
                      width={110}
                      tick={{ fontSize: 11 }}
                      stroke="#7d8b6f"
                    />
                    <Tooltip content={<CustomTooltipCurrency />} />
                    <Bar dataKey="valor" name="Valor" radius={[0, 4, 4, 0]}>
                      {data.despesasPorClasse.map((_, i) => (
                        <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          {/* Linha: Natureza + Tipo de Plano */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
            <ChartCard
              title="Valor por Natureza de Despesa"
              subtitle="Para onde o dinheiro está classificado (GND 3/4)"
              className="lg:col-span-3"
            >
              <div className="h-64 sm:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.valorPorNatureza}
                    layout="vertical"
                    margin={{ left: 0, right: 16, top: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e9e2" horizontal={false} />
                    <XAxis
                      type="number"
                      tickFormatter={(v) => formatCurrencyCompact(v)}
                      tick={{ fontSize: 10 }}
                      stroke="#7d8b6f"
                    />
                    <YAxis
                      type="category"
                      dataKey="codigo"
                      width={70}
                      tick={{ fontSize: 11 }}
                      stroke="#7d8b6f"
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload.length) return null;
                        const p = payload[0].payload;
                        return (
                          <div className="bg-white border border-olive-300 rounded-md shadow-lg px-3 py-2 text-xs max-w-[220px]">
                            <div className="font-medium text-military-900">{p.codigo}</div>
                            <div className="text-olive-600 mb-1">{p.nome}</div>
                            <div className="text-military-700">{formatCurrency(p.valor)}</div>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="valor" name="Valor" radius={[0, 4, 4, 0]}>
                      {data.valorPorNatureza.map((_, i) => (
                        <Cell key={i} fill={PALETTE[(i + 2) % PALETTE.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard
              title="Planos por Tipo"
              subtitle="Logístico × Operacional × Ração/Munição"
              className="lg:col-span-2"
            >
              <div className="h-56 sm:h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.planosPorTipo}
                      dataKey="count"
                      nameKey="label"
                      innerRadius="55%"
                      outerRadius="85%"
                      paddingAngle={2}
                    >
                      {data.planosPorTipo.map((_, i) => (
                        <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={((value: number, _name: unknown, props: any) => [
                        `${value} plano(s) · ${formatCurrency(props.payload.valor)}`,
                        props.payload.label,
                      ]) as any}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          {/* Linha: Top Operações + Top OMs */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <ChartCard
              title="Top Operações por Valor"
              subtitle="Maiores operações pelo total de despesas dos seus planos"
            >
              <div className="h-64 sm:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.topOperacoes.map((o) => ({ ...o, nomeCurto: truncar(o.nome, 18) }))}
                    layout="vertical"
                    margin={{ left: 0, right: 16, top: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e9e2" horizontal={false} />
                    <XAxis
                      type="number"
                      tickFormatter={(v) => formatCurrencyCompact(v)}
                      tick={{ fontSize: 10 }}
                      stroke="#7d8b6f"
                    />
                    <YAxis
                      type="category"
                      dataKey="nomeCurto"
                      width={110}
                      tick={{ fontSize: 11 }}
                      stroke="#7d8b6f"
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload.length) return null;
                        const p = payload[0].payload;
                        return (
                          <div className="bg-white border border-olive-300 rounded-md shadow-lg px-3 py-2 text-xs max-w-[240px]">
                            <div className="font-medium text-military-900">{p.nome}</div>
                            <div className="text-olive-600 mb-1">OM: {p.om}</div>
                            <div className="text-military-700">{formatCurrency(p.valor)}</div>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="valor" name="Valor" fill="#556647" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard
              title="Top OMs por Valor de Planos"
              subtitle="OMs com maior valor total em planos de trabalho"
            >
              <div className="h-64 sm:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.topOMs}
                    layout="vertical"
                    margin={{ left: 0, right: 16, top: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e9e2" horizontal={false} />
                    <XAxis
                      type="number"
                      tickFormatter={(v) => formatCurrencyCompact(v)}
                      tick={{ fontSize: 10 }}
                      stroke="#7d8b6f"
                    />
                    <YAxis
                      type="category"
                      dataKey="sigla"
                      width={100}
                      tick={{ fontSize: 11 }}
                      stroke="#7d8b6f"
                    />
                    <Tooltip content={<CustomTooltipCurrency />} />
                    <Bar dataKey="valor" name="Valor" fill="#b45309" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>
        </>
      )}

      {/* Usuários por role + Atividade recente */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <ChartCard title="Usuários por Perfil" subtitle="Distribuição de papéis no seu escopo">
          <div className="h-48 sm:h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.usuariosPorRole}
                  dataKey="count"
                  nameKey="label"
                  innerRadius="50%"
                  outerRadius="80%"
                  paddingAngle={2}
                >
                  {data.usuariosPorRole.map((_, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <div className="lg:col-span-2 bg-white rounded-lg border border-olive-200 p-4 sm:p-5">
          <h3 className="text-sm sm:text-base font-semibold text-military-900 flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-military-600" />
            Atividade Recente
          </h3>
          {data.atividadeRecente.length === 0 ? (
            <p className="text-sm text-olive-600">Nenhuma atividade registrada ainda.</p>
          ) : (
            <ul className="divide-y divide-olive-100 max-h-80 overflow-y-auto">
              {data.atividadeRecente.map((a) => (
                <li key={a.id} className="py-2.5 flex items-start gap-3">
                  <span className="mt-1.5 w-2 h-2 rounded-full bg-military-500 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-military-900 break-words">{a.descricao}</p>
                    <p className="text-xs text-olive-500 mt-0.5">
                      {a.tipoLabel}
                      {a.usuario ? ` · ${a.usuario}` : ""} · {tempoRelativo(a.timestamp)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
