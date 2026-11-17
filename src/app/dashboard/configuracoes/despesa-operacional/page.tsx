"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { GNDS_VALIDOS, type GndValido } from "@/lib/configuracoes/rascunhoDespesaOperacional";

interface RascunhoDTO {
  id: string;
  gnd: string;
  titulo: string;
  objeto: string | null;
  objetivo: string | null;
  finalidade: string | null;
  memoriaCalculo: string | null;
  ordem: number;
}

interface RascunhoForm {
  titulo: string;
  objeto: string;
  objetivo: string;
  finalidade: string;
  memoriaCalculo: string;
}

function paraForm(r: RascunhoDTO): RascunhoForm {
  return {
    titulo: r.titulo,
    objeto: r.objeto ?? "",
    objetivo: r.objetivo ?? "",
    finalidade: r.finalidade ?? "",
    memoriaCalculo: r.memoriaCalculo ?? "",
  };
}

const FORM_VAZIO: RascunhoForm = {
  titulo: "",
  objeto: "",
  objetivo: "",
  finalidade: "",
  memoriaCalculo: "",
};

export default function ConfiguracoesDespesaOperacionalPage() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [autorizado, setAutorizado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  const [gndAtivo, setGndAtivo] = useState<GndValido>(GNDS_VALIDOS[0]);
  const [rascunhos, setRascunhos] = useState<RascunhoDTO[]>([]);
  const [edicoes, setEdicoes] = useState<Record<string, RascunhoForm>>({});
  const [salvando, setSalvando] = useState<Set<string>>(new Set());
  const [novo, setNovo] = useState<RascunhoForm | null>(null);
  const [criando, setCriando] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const meResponse = await fetch("/api/auth/me");
        if (!meResponse.ok) {
          router.push("/login");
          return;
        }
        const me = await meResponse.json();
        if (me.role !== "SUPER_ADMIN") {
          router.push("/dashboard");
          return;
        }
        setAutorizado(true);
        await carregar();
      } catch (err) {
        console.error(err);
        setErro("Erro ao carregar rascunhos de despesa operacional");
      } finally {
        setCarregando(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function carregar() {
    const response = await fetch("/api/configuracoes/despesa-operacional-rascunho");
    if (response.ok) {
      const data: RascunhoDTO[] = await response.json();
      setRascunhos(data);
    }
  }

  function valorCampo(r: RascunhoDTO, campo: keyof RascunhoForm): string {
    return edicoes[r.id]?.[campo] ?? paraForm(r)[campo];
  }

  function onCampoChange(r: RascunhoDTO, campo: keyof RascunhoForm, valor: string) {
    setEdicoes((prev) => ({
      ...prev,
      [r.id]: { ...(prev[r.id] ?? paraForm(r)), [campo]: valor },
    }));
  }

  function temEdicaoPendente(r: RascunhoDTO): boolean {
    return r.id in edicoes;
  }

  async function salvar(r: RascunhoDTO) {
    const form = edicoes[r.id] ?? paraForm(r);
    setSalvando((prev) => new Set(prev).add(r.id));
    setErro(null);
    try {
      const response = await fetch(`/api/configuracoes/despesa-operacional-rascunho/${r.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gnd: r.gnd, ordem: r.ordem, ...form }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erro ao salvar rascunho");

      setRascunhos((prev) => prev.map((x) => (x.id === r.id ? data : x)));
      setEdicoes((prev) => {
        const next = { ...prev };
        delete next[r.id];
        return next;
      });
      setSucesso(`Modelo "${form.titulo}" atualizado.`);
      setTimeout(() => setSucesso(null), 3000);
    } catch (err: any) {
      setErro(err.message || "Erro ao salvar rascunho");
      setTimeout(() => setErro(null), 5000);
    } finally {
      setSalvando((prev) => {
        const next = new Set(prev);
        next.delete(r.id);
        return next;
      });
    }
  }

  async function remover(r: RascunhoDTO) {
    if (!confirm(`Remover o modelo "${r.titulo}"? Essa ação não pode ser desfeita.`)) return;
    setSalvando((prev) => new Set(prev).add(r.id));
    setErro(null);
    try {
      const response = await fetch(`/api/configuracoes/despesa-operacional-rascunho/${r.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erro ao remover rascunho");
      }
      setRascunhos((prev) => prev.filter((x) => x.id !== r.id));
      setSucesso(`Modelo "${r.titulo}" removido.`);
      setTimeout(() => setSucesso(null), 3000);
    } catch (err: any) {
      setErro(err.message || "Erro ao remover rascunho");
      setTimeout(() => setErro(null), 5000);
    } finally {
      setSalvando((prev) => {
        const next = new Set(prev);
        next.delete(r.id);
        return next;
      });
    }
  }

  async function criar() {
    if (!novo || !novo.titulo.trim()) {
      setErro("Informe um título para o novo modelo.");
      return;
    }
    setCriando(true);
    setErro(null);
    try {
      const response = await fetch("/api/configuracoes/despesa-operacional-rascunho", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gnd: gndAtivo,
          ordem: rascunhos.filter((r) => r.gnd === gndAtivo).length + 1,
          ...novo,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erro ao criar rascunho");

      setRascunhos((prev) => [...prev, data]);
      setNovo(null);
      setSucesso(`Modelo "${data.titulo}" criado.`);
      setTimeout(() => setSucesso(null), 3000);
    } catch (err: any) {
      setErro(err.message || "Erro ao criar rascunho");
      setTimeout(() => setErro(null), 5000);
    } finally {
      setCriando(false);
    }
  }

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-olive-700">Carregando...</div>
      </div>
    );
  }

  if (!autorizado) {
    return null;
  }

  const rascunhosDoGnd = rascunhos
    .filter((r) => r.gnd === gndAtivo)
    .sort((a, b) => a.ordem - b.ordem);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-military-900 mb-2">
          Configurações &gt; Despesa Operacional
        </h1>
        <p className="text-olive-700">
          Modelos de pré-preenchimento para a Despesa Operacional de Planos de Trabalho
          Operacional (GND 3 / GND 4). Ao criar uma despesa, o usuário pode escolher um modelo
          pelo título e os campos de Objeto, Objetivo, Finalidade e Memória de Cálculo são
          preenchidos automaticamente — e continuam totalmente editáveis depois.
        </p>
      </div>

      {erro && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>{erro}</span>
        </div>
      )}

      {sucesso && (
        <div className="mb-6 bg-military-50 border border-military-200 text-military-800 px-4 py-3 rounded-lg">
          {sucesso}
        </div>
      )}

      {/* Abas por GND */}
      <div className="mb-4 flex flex-wrap gap-2 border-b border-olive-200 pb-3">
        {GNDS_VALIDOS.map((gnd) => (
          <button
            key={gnd}
            onClick={() => setGndAtivo(gnd)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              gndAtivo === gnd
                ? "bg-military-600 text-white"
                : "bg-white text-olive-700 border border-olive-200 hover:bg-olive-50"
            }`}
          >
            {gnd}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {rascunhosDoGnd.map((r) => {
          const dirty = temEdicaoPendente(r);
          const estaSalvando = salvando.has(r.id);
          return (
            <div key={r.id} className="bg-white rounded-lg border border-olive-200 p-4 sm:p-6">
              <div className="flex items-start justify-between gap-3 mb-3">
                <input
                  value={valorCampo(r, "titulo")}
                  onChange={(e) => onCampoChange(r, "titulo", e.target.value)}
                  className="font-semibold text-military-900 text-sm sm:text-base flex-1 px-2 py-1 border border-transparent hover:border-olive-200 focus:border-military-400 rounded-md focus:outline-none"
                />
                <div className="flex items-center gap-2 shrink-0">
                  {dirty && (
                    <Button
                      size="sm"
                      onClick={() => salvar(r)}
                      disabled={estaSalvando}
                      className="flex items-center gap-1"
                    >
                      <Save className="w-3.5 h-3.5" />
                      Salvar
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => remover(r)}
                    disabled={estaSalvando}
                    className="flex items-center gap-1 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-olive-700 mb-1">Objeto</label>
                  <textarea
                    value={valorCampo(r, "objeto")}
                    onChange={(e) => onCampoChange(r, "objeto", e.target.value)}
                    rows={3}
                    className="w-full px-2 py-1.5 border border-olive-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-military-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-olive-700 mb-1">Objetivo</label>
                  <textarea
                    value={valorCampo(r, "objetivo")}
                    onChange={(e) => onCampoChange(r, "objetivo", e.target.value)}
                    rows={3}
                    className="w-full px-2 py-1.5 border border-olive-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-military-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-olive-700 mb-1">Finalidade</label>
                  <textarea
                    value={valorCampo(r, "finalidade")}
                    onChange={(e) => onCampoChange(r, "finalidade", e.target.value)}
                    rows={3}
                    className="w-full px-2 py-1.5 border border-olive-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-military-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-olive-700 mb-1">
                    Memória de Cálculo
                  </label>
                  <textarea
                    value={valorCampo(r, "memoriaCalculo")}
                    onChange={(e) => onCampoChange(r, "memoriaCalculo", e.target.value)}
                    rows={3}
                    className="w-full px-2 py-1.5 border border-olive-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-military-500 font-mono"
                  />
                </div>
              </div>
            </div>
          );
        })}

        {novo ? (
          <div className="bg-white rounded-lg border-2 border-dashed border-military-300 p-4 sm:p-6">
            <input
              autoFocus
              placeholder="Título do modelo (ex.: DIÁRIA)"
              value={novo.titulo}
              onChange={(e) => setNovo({ ...novo, titulo: e.target.value })}
              className="w-full mb-3 px-2 py-1.5 border border-olive-300 rounded-md text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-military-500"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-medium text-olive-700 mb-1">Objeto</label>
                <textarea
                  value={novo.objeto}
                  onChange={(e) => setNovo({ ...novo, objeto: e.target.value })}
                  rows={3}
                  className="w-full px-2 py-1.5 border border-olive-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-military-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-olive-700 mb-1">Objetivo</label>
                <textarea
                  value={novo.objetivo}
                  onChange={(e) => setNovo({ ...novo, objetivo: e.target.value })}
                  rows={3}
                  className="w-full px-2 py-1.5 border border-olive-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-military-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-olive-700 mb-1">Finalidade</label>
                <textarea
                  value={novo.finalidade}
                  onChange={(e) => setNovo({ ...novo, finalidade: e.target.value })}
                  rows={3}
                  className="w-full px-2 py-1.5 border border-olive-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-military-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-olive-700 mb-1">
                  Memória de Cálculo
                </label>
                <textarea
                  value={novo.memoriaCalculo}
                  onChange={(e) => setNovo({ ...novo, memoriaCalculo: e.target.value })}
                  rows={3}
                  className="w-full px-2 py-1.5 border border-olive-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-military-500 font-mono"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={criar} disabled={criando}>
                Criar modelo
              </Button>
              <Button size="sm" variant="outline" onClick={() => setNovo(null)} disabled={criando}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setNovo(FORM_VAZIO)}
            className="w-full px-3 py-3 border-2 border-dashed border-olive-300 rounded-lg text-sm text-olive-700 hover:border-military-400 hover:text-military-700 hover:bg-olive-50 transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Adicionar modelo para {gndAtivo}
          </button>
        )}
      </div>
    </div>
  );
}
