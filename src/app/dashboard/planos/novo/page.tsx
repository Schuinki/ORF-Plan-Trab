"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { HelpTooltip } from "@/components/ui/HelpTooltip";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useSession } from "@/hooks/useSession";

interface Operacao {
  id: string;
  nome: string;
  status: string;
  om: {
    nome: string;
    sigla: string;
  };
}

const TIPOS_PLANO = [
  {
    value: "LOGISTICO",
    label: "Logístico",
    descricao:
      "Para despesas de apoio à tropa: alimentação, combustível, material, manutenção de viaturas, etc. (Classes I a X).",
  },
  {
    value: "OPERACIONAL_GND3",
    label: "Operacional (GND 3)",
    descricao:
      "Para despesas diretamente ligadas à execução da operação: diárias, passagens, locação de serviços, etc. (custeio).",
  },
  {
    value: "OPERACIONAL_GND4",
    label: "Operacional (GND 4)",
    descricao:
      "Para aquisição de equipamentos e material permanente ligados à operação (investimento).",
  },
  {
    value: "RACAO_R2",
    label: "Ração (R-2)",
    descricao:
      "Para itens de ração operacional (R-2): lançamento por item e quantidade, sem rateio de valor.",
  },
  {
    value: "MUNICAO",
    label: "Munição",
    descricao:
      "Para itens de munição (por NEE/NSN): lançamento por item e quantidade, sem rateio de valor.",
  },
];

export default function NovoPlanoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [operacao, setOperacao] = useState<Operacao | null>(null);
  const [loadingOperacao, setLoadingOperacao] = useState(true);
  const [tituloEditado, setTituloEditado] = useState(false);

  const operacaoId = searchParams.get("operacaoId") || "";

  const [formData, setFormData] = useState({
    titulo: "",
    tipo: searchParams.get("tipo") || "LOGISTICO",
    omId: searchParams.get("omId") || user?.om.id || "",
  });

  // Um plano só pode ser criado a partir de dentro de uma operação. Sem o
  // operacaoId na URL (ex.: usuário digitou a página diretamente), manda de
  // volta para a lista de operações.
  useEffect(() => {
    if (!operacaoId) {
      router.replace("/dashboard/operacoes");
      return;
    }

    fetch(`/api/operacoes/${operacaoId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Operação não encontrada");
        return res.json();
      })
      .then((data) => setOperacao(data))
      .catch(() => router.replace("/dashboard/operacoes"))
      .finally(() => setLoadingOperacao(false));
  }, [operacaoId, router]);

  useEffect(() => {
    if (user?.om.id && !formData.omId) {
      setFormData((prev) => ({ ...prev, omId: user.om.id }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.om.id]);

  const TIPO_ABREV: Record<string, string> = {
    LOGISTICO: "LOG",
    OPERACIONAL_GND3: "OP GND3",
    OPERACIONAL_GND4: "OP GND4",
    RACAO_R2: "R-2",
    MUNICAO: "MUN",
  };

  // Título padrão inclui a OM e o nome da operação
  useEffect(() => {
    if (tituloEditado || !operacao) return;

    // A sigla deve ser da OM para a qual o plano está sendo criado
    // (formData.omId), não necessariamente a OM do usuário logado — um S4
    // pode estar criando o plano em nome de uma OM subordinada.
    const omSiglaParam = searchParams.get("omSigla");
    const sigla =
      omSiglaParam ||
      (formData.omId === user?.om.id ? user?.om.sigla : "") ||
      "";
    const partes = [
      `P Trab ${TIPO_ABREV[formData.tipo] || formData.tipo}`,
      sigla,
      `- ${operacao.nome}`,
    ].filter(Boolean);

    setFormData((prev) => ({ ...prev, titulo: partes.join(" ") }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.tipo, operacao, user?.om.sigla, tituloEditado]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/planos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, operacaoId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao criar plano");
      }

      router.push(`/dashboard/planos/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar plano");
    } finally {
      setIsLoading(false);
    }
  };

  if (loadingOperacao || !operacao) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-military-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href={`/dashboard/operacoes/${operacaoId}`}
          className="inline-flex items-center text-olive-700 hover:text-military-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar à Operação: {operacao.nome}
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold text-military-900">
          Novo Plano de Trabalho
        </h1>
        <p className="text-olive-700 mt-1">
          Você está criando um plano de trabalho para a operação{" "}
          <strong>{operacao.nome}</strong>, em nome da sua OM.
        </p>
      </div>

      <div className="bg-white rounded-lg border border-olive-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="flex items-center gap-1.5 text-sm font-medium text-olive-800 mb-2">
                Tipo de Plano <span className="text-red-600">*</span>
              </label>
              <div className="space-y-2">
                {TIPOS_PLANO.map((tp) => (
                  <label
                    key={tp.value}
                    className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                      formData.tipo === tp.value
                        ? "border-military-500 bg-military-50"
                        : "border-olive-200 hover:border-olive-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="tipo"
                      value={tp.value}
                      checked={formData.tipo === tp.value}
                      onChange={(e) =>
                        setFormData({ ...formData, tipo: e.target.value })
                      }
                      className="mt-1"
                    />
                    <span>
                      <span className="block font-medium text-military-900">
                        {tp.label}
                      </span>
                      <span className="block text-xs text-olive-600 mt-0.5">
                        {tp.descricao}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center gap-1.5 text-sm font-medium text-olive-800 mb-1">
                Título do Plano
                <HelpTooltip>
                  Preenchido automaticamente com base no tipo escolhido e na
                  operação. Você pode alterar à vontade — é só um nome para
                  identificar o plano.
                </HelpTooltip>
              </label>
              <Input
                value={formData.titulo}
                onChange={(e) => {
                  setTituloEditado(true);
                  setFormData({ ...formData, titulo: e.target.value });
                }}
                placeholder="Ex: P Trab LOG CMA - Operação CATRIMANI II"
                required
              />
            </div>
          </div>
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-4">
            <Button type="submit" isLoading={isLoading}>
              Criar Plano de Trabalho
            </Button>
            <Link href={`/dashboard/operacoes/${operacaoId}`}>
              <Button type="button" variant="secondary">
                Cancelar
              </Button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
