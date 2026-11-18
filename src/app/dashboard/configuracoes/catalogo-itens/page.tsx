"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

type Aba = "MUNICAO" | "RACAO";

interface ItemMunicaoDTO {
  id: string;
  neeNsn: string;
  tipo: string;
  ordem: number;
}

interface ItemRacaoDTO {
  id: string;
  item: string;
  ordem: number;
}

export default function ConfiguracoesCatalogoItensPage() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [autorizado, setAutorizado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  const [aba, setAba] = useState<Aba>("MUNICAO");

  const [itensMunicao, setItensMunicao] = useState<ItemMunicaoDTO[]>([]);
  const [itensRacao, setItensRacao] = useState<ItemRacaoDTO[]>([]);

  const [novoNeeNsn, setNovoNeeNsn] = useState("");
  const [novoTipo, setNovoTipo] = useState("");
  const [novoItemRacao, setNovoItemRacao] = useState("");
  const [criando, setCriando] = useState(false);
  const [salvando, setSalvando] = useState<Set<string>>(new Set());

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
        setErro("Erro ao carregar catálogos");
      } finally {
        setCarregando(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function carregar() {
    const [resMunicao, resRacao] = await Promise.all([
      fetch("/api/configuracoes/catalogo-municao"),
      fetch("/api/configuracoes/catalogo-racao"),
    ]);
    if (resMunicao.ok) setItensMunicao(await resMunicao.json());
    if (resRacao.ok) setItensRacao(await resRacao.json());
  }

  async function criarMunicao() {
    if (!novoNeeNsn.trim() || !novoTipo.trim()) {
      setErro("Informe o NEE/NSN e o tipo do item de munição.");
      return;
    }
    setCriando(true);
    setErro(null);
    try {
      const response = await fetch("/api/configuracoes/catalogo-municao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          neeNsn: novoNeeNsn.trim(),
          tipo: novoTipo.trim(),
          ordem: itensMunicao.length + 1,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erro ao criar item");
      setItensMunicao((prev) => [...prev, data]);
      setNovoNeeNsn("");
      setNovoTipo("");
      setSucesso(`Item "${data.tipo}" adicionado ao catálogo de munição.`);
      setTimeout(() => setSucesso(null), 3000);
    } catch (err: any) {
      setErro(err.message || "Erro ao criar item");
      setTimeout(() => setErro(null), 5000);
    } finally {
      setCriando(false);
    }
  }

  async function removerMunicao(item: ItemMunicaoDTO) {
    if (!confirm(`Remover "${item.tipo}" do catálogo de munição?`)) return;
    setSalvando((prev) => new Set(prev).add(item.id));
    try {
      const response = await fetch(`/api/configuracoes/catalogo-municao/${item.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erro ao remover item");
      }
      setItensMunicao((prev) => prev.filter((i) => i.id !== item.id));
    } catch (err: any) {
      setErro(err.message || "Erro ao remover item");
      setTimeout(() => setErro(null), 5000);
    } finally {
      setSalvando((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  }

  async function criarRacao() {
    if (!novoItemRacao.trim()) {
      setErro("Informe o nome do item de ração.");
      return;
    }
    setCriando(true);
    setErro(null);
    try {
      const response = await fetch("/api/configuracoes/catalogo-racao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item: novoItemRacao.trim(),
          ordem: itensRacao.length + 1,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erro ao criar item");
      setItensRacao((prev) => [...prev, data]);
      setNovoItemRacao("");
      setSucesso(`Item "${data.item}" adicionado ao catálogo de ração.`);
      setTimeout(() => setSucesso(null), 3000);
    } catch (err: any) {
      setErro(err.message || "Erro ao criar item");
      setTimeout(() => setErro(null), 5000);
    } finally {
      setCriando(false);
    }
  }

  async function removerRacao(item: ItemRacaoDTO) {
    if (!confirm(`Remover "${item.item}" do catálogo de ração?`)) return;
    setSalvando((prev) => new Set(prev).add(item.id));
    try {
      const response = await fetch(`/api/configuracoes/catalogo-racao/${item.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erro ao remover item");
      }
      setItensRacao((prev) => prev.filter((i) => i.id !== item.id));
    } catch (err: any) {
      setErro(err.message || "Erro ao remover item");
      setTimeout(() => setErro(null), 5000);
    } finally {
      setSalvando((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
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

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-military-900 mb-2">
          Configurações &gt; Catálogo de Itens
        </h1>
        <p className="text-olive-700">
          Itens de Munição e Ração pré-cadastrados pelo admin. Eles aparecem como opções
          selecionáveis ao lançar um item nos respectivos Planos de Trabalho — o usuário
          também pode continuar digitando um item livre fora do catálogo.
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

      <div className="mb-4 flex flex-wrap gap-2 border-b border-olive-200 pb-3">
        {(["MUNICAO", "RACAO"] as Aba[]).map((a) => (
          <button
            key={a}
            onClick={() => setAba(a)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              aba === a
                ? "bg-military-600 text-white"
                : "bg-white text-olive-700 border border-olive-200 hover:bg-olive-50"
            }`}
          >
            {a === "MUNICAO" ? "Munição" : "Ração (R-2)"}
          </button>
        ))}
      </div>

      {aba === "MUNICAO" ? (
        <div className="bg-white rounded-lg border border-olive-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-military-50 border-b border-olive-200">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-military-900 uppercase">
                  NEE/NSN
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-military-900 uppercase">
                  Tipo
                </th>
                <th className="px-4 py-2 w-16" />
              </tr>
            </thead>
            <tbody className="divide-y divide-olive-100">
              {itensMunicao.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-2 text-sm text-military-900">{item.neeNsn}</td>
                  <td className="px-4 py-2 text-sm text-military-900">{item.tipo}</td>
                  <td className="px-4 py-2 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => removerMunicao(item)}
                      disabled={salvando.has(item.id)}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
              <tr>
                <td className="px-4 py-2">
                  <input
                    value={novoNeeNsn}
                    onChange={(e) => setNovoNeeNsn(e.target.value)}
                    placeholder="Ex: 1305-00-000-0000"
                    className="w-full px-2 py-1.5 border border-olive-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-military-500"
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    value={novoTipo}
                    onChange={(e) => setNovoTipo(e.target.value)}
                    placeholder="Ex: Munição 5,56mm"
                    className="w-full px-2 py-1.5 border border-olive-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-military-500"
                  />
                </td>
                <td className="px-4 py-2 text-right">
                  <Button size="sm" onClick={criarMunicao} disabled={criando}>
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-olive-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-military-50 border-b border-olive-200">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-military-900 uppercase">
                  Item
                </th>
                <th className="px-4 py-2 w-16" />
              </tr>
            </thead>
            <tbody className="divide-y divide-olive-100">
              {itensRacao.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-2 text-sm text-military-900">{item.item}</td>
                  <td className="px-4 py-2 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => removerRacao(item)}
                      disabled={salvando.has(item.id)}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
              <tr>
                <td className="px-4 py-2">
                  <input
                    value={novoItemRacao}
                    onChange={(e) => setNovoItemRacao(e.target.value)}
                    placeholder="Ex: Ração Operacional Tipo I"
                    className="w-full px-2 py-1.5 border border-olive-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-military-500"
                  />
                </td>
                <td className="px-4 py-2 text-right">
                  <Button size="sm" onClick={criarRacao} disabled={criando}>
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
