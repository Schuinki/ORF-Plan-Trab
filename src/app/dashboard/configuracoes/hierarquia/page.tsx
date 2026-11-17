"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight, Network, Pencil, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { getTipoOMLabel } from "@/lib/constants";

interface OM {
  id: string;
  nome: string;
  sigla: string;
  tipo: string;
  codUG: string | null;
  omPaiId: string | null;
}

interface NoArvoreProps {
  om: OM;
  nivel: number;
  filhosDe: Map<string, OM[]>;
  colapsados: Set<string>;
  onToggleColapso: (id: string) => void;
  onEditar: (om: OM) => void;
  termoBusca: string;
  idsVisiveis: Set<string> | null;
}

function NoArvore({
  om,
  nivel,
  filhosDe,
  colapsados,
  onToggleColapso,
  onEditar,
  termoBusca,
  idsVisiveis,
}: NoArvoreProps) {
  if (idsVisiveis && !idsVisiveis.has(om.id)) return null;

  const filhos = filhosDe.get(om.id) || [];
  const temFilhos = filhos.length > 0;
  // Durante uma busca ativa, a árvore já vem podada só com os caminhos até
  // as OMs encontradas — então sempre mostramos tudo que sobrou, ignorando
  // o colapso manual (senão um nó recolhido escondia o próprio resultado).
  const colapsado = termoBusca ? false : colapsados.has(om.id);
  const combina =
    !!termoBusca &&
    (om.sigla.toLowerCase().includes(termoBusca) ||
      om.nome.toLowerCase().includes(termoBusca));

  return (
    <div>
      <div
        className={`flex items-center gap-2 py-1.5 pr-2 rounded-md hover:bg-olive-50 group ${
          combina ? "bg-amber-50" : ""
        }`}
        style={{ paddingLeft: nivel * 20 + 4 }}
      >
        <button
          onClick={() => temFilhos && onToggleColapso(om.id)}
          className={`w-5 h-5 flex items-center justify-center shrink-0 ${
            temFilhos ? "text-olive-600 hover:text-military-700" : ""
          }`}
          disabled={!temFilhos}
        >
          {temFilhos ? (
            colapsado ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )
          ) : (
            <span className="w-1.5 h-1.5 rounded-full bg-olive-300 inline-block" />
          )}
        </button>
        <span className="font-medium text-military-900 text-sm shrink-0">
          {om.sigla}
        </span>
        <span className="text-sm text-olive-600 truncate">{om.nome}</span>
        <span className="text-xs text-olive-500 shrink-0 hidden sm:inline">
          {getTipoOMLabel(om.tipo)}
        </span>
        {temFilhos && (
          <span className="text-xs text-olive-400 shrink-0">
            ({filhos.length} subordinada{filhos.length > 1 ? "s" : ""})
          </span>
        )}
        <button
          onClick={() => onEditar(om)}
          className="ml-auto opacity-0 group-hover:opacity-100 p-1 text-military-600 hover:bg-military-100 rounded transition-opacity shrink-0"
          title="Alterar OM pai"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
      </div>
      {!colapsado &&
        filhos.map((filho) => (
          <NoArvore
            key={filho.id}
            om={filho}
            nivel={nivel + 1}
            filhosDe={filhosDe}
            colapsados={colapsados}
            onToggleColapso={onToggleColapso}
            onEditar={onEditar}
            termoBusca={termoBusca}
            idsVisiveis={idsVisiveis}
          />
        ))}
    </div>
  );
}

const RAIZ = "__raiz__";

export default function HierarquiaPadraoPage() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [autorizado, setAutorizado] = useState(false);
  const [oms, setOms] = useState<OM[]>([]);
  const [busca, setBusca] = useState("");
  const [colapsados, setColapsados] = useState<Set<string>>(new Set());
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  const [omEditando, setOmEditando] = useState<OM | null>(null);
  const [novoPaiId, setNovoPaiId] = useState<string>("");
  const [salvando, setSalvando] = useState(false);
  const [erroModal, setErroModal] = useState("");

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
        setErro("Erro ao carregar organizações militares");
      } finally {
        setCarregando(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function carregar() {
    const response = await fetch("/api/organizacoes");
    if (response.ok) {
      setOms(await response.json());
    }
  }

  const porId = useMemo(() => new Map(oms.map((o) => [o.id, o])), [oms]);

  const filhosDe = useMemo(() => {
    const map = new Map<string, OM[]>();
    for (const om of oms) {
      const chave = om.omPaiId && porId.has(om.omPaiId) ? om.omPaiId : RAIZ;
      if (!map.has(chave)) map.set(chave, []);
      map.get(chave)!.push(om);
    }
    for (const lista of map.values()) {
      lista.sort((a, b) => a.sigla.localeCompare(b.sigla));
    }
    return map;
  }, [oms, porId]);

  const termoBusca = busca.trim().toLowerCase();

  // Quando há busca ativa: conjunto de OMs que batem + todos os ancestrais
  // delas, para o caminho até a raiz ficar visível na árvore podada.
  const idsVisiveis = useMemo(() => {
    if (!termoBusca) return null;
    const set = new Set<string>();
    for (const om of oms) {
      if (
        om.sigla.toLowerCase().includes(termoBusca) ||
        om.nome.toLowerCase().includes(termoBusca)
      ) {
        set.add(om.id);
        let cursor = om.omPaiId;
        while (cursor && !set.has(cursor)) {
          set.add(cursor);
          cursor = porId.get(cursor)?.omPaiId ?? null;
        }
      }
    }
    return set;
  }, [termoBusca, oms, porId]);

  const toggleColapso = (id: string) => {
    setColapsados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const abrirEdicao = (om: OM) => {
    setOmEditando(om);
    setNovoPaiId(om.omPaiId || "");
    setErroModal("");
  };

  const salvarPai = async () => {
    if (!omEditando) return;
    setSalvando(true);
    setErroModal("");
    try {
      const response = await fetch(`/api/organizacoes/${omEditando.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ omPaiId: novoPaiId || null }),
      });
      const data = await response.json();
      if (!response.ok) {
        setErroModal(data.error || "Erro ao salvar");
        return;
      }
      setSucesso(`Hierarquia de ${omEditando.sigla} atualizada.`);
      setOmEditando(null);
      await carregar();
      setTimeout(() => setSucesso(null), 4000);
    } catch {
      setErroModal("Erro ao salvar");
    } finally {
      setSalvando(false);
    }
  };

  const raizes = filhosDe.get(RAIZ) || [];

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-olive-700">Carregando...</div>
      </div>
    );
  }

  if (!autorizado) return null;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-military-900 mb-2 flex items-center gap-2">
          <Network className="w-7 h-7 text-military-600" />
          Hierarquia Padrão
        </h1>
        <p className="text-olive-700">
          Estrutura cadastral de OM pai/subordinada usada por padrão na cadeia
          de aprovação em todo o sistema. Cada operação pode sobrepor isso
          pontualmente, mas esta é a hierarquia global.
        </p>
      </div>

      {erro && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          {erro}
        </div>
      )}
      {sucesso && (
        <div className="mb-6 bg-military-50 border border-military-200 text-military-800 px-4 py-3 rounded-lg">
          {sucesso}
        </div>
      )}

      <div className="mb-4 relative max-w-md">
        <Search className="w-4 h-4 text-olive-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar OM por sigla ou nome..."
          className="w-full pl-9 pr-3 py-2 border border-olive-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-military-500 focus:border-transparent"
        />
      </div>

      <div className="bg-white rounded-lg border border-olive-200 p-4 overflow-x-auto">
        {raizes.length === 0 ? (
          <p className="text-olive-600 text-center py-8">
            {termoBusca
              ? `Nenhuma OM encontrada para "${busca}".`
              : "Nenhuma OM cadastrada."}
          </p>
        ) : (
          raizes.map((om) => (
            <NoArvore
              key={om.id}
              om={om}
              nivel={0}
              filhosDe={filhosDe}
              colapsados={colapsados}
              onToggleColapso={toggleColapso}
              onEditar={abrirEdicao}
              termoBusca={termoBusca}
              idsVisiveis={idsVisiveis}
            />
          ))
        )}
      </div>

      {/* Modal de edição */}
      {omEditando && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Alterar OM pai
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {omEditando.sigla} - {omEditando.nome}
            </p>
            <label className="block text-sm font-medium text-olive-800 mb-1">
              Nova OM pai
            </label>
            <select
              value={novoPaiId}
              onChange={(e) => setNovoPaiId(e.target.value)}
              className="w-full px-3 py-2 border border-olive-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-military-500 bg-white text-sm"
            >
              <option value="">(Nenhuma — topo da hierarquia)</option>
              {oms
                .filter((o) => o.id !== omEditando.id)
                .sort((a, b) => a.sigla.localeCompare(b.sigla))
                .map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.sigla} - {o.nome}
                  </option>
                ))}
            </select>
            {erroModal && (
              <p className="text-sm text-red-600 mt-2">{erroModal}</p>
            )}
            <div className="flex justify-end gap-2 mt-5">
              <Button
                variant="outline"
                onClick={() => setOmEditando(null)}
                disabled={salvando}
              >
                Cancelar
              </Button>
              <Button variant="primary" onClick={salvarPai} isLoading={salvando}>
                Salvar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
