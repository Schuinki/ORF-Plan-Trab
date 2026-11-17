"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, RotateCcw, Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  REGISTRO_PRECOS,
  type GrupoRegistroPreco,
  type ItemRegistroPreco,
} from "@/lib/configuracoes/registroPrecos";

interface ConfiguracaoPrecoDTO {
  classe: string;
  grupo: string;
  chave: string;
  nome: string;
  dados: Record<string, number>;
}

const LABEL_CLASSE: Record<string, string> = {
  CLASSE_II: "Classe II — Fardamento / Equipamento",
  CLASSE_III: "Classe III — Combustível",
  CLASSE_V: "Classe V — Armamento",
  CLASSE_VI: "Classe VI — Equip. de Engenharia",
  CLASSE_VII: "Classe VII — Equip. Eletrônicos",
  CLASSE_VIII: "Classe VIII — Saúde",
  CLASSE_IX: "Classe IX — Viaturas",
};

const ORDEM_CLASSES = [
  "CLASSE_II",
  "CLASSE_III",
  "CLASSE_V",
  "CLASSE_VI",
  "CLASSE_VII",
  "CLASSE_VIII",
  "CLASSE_IX",
];

function chaveCompleta(classe: string, grupo: string, chave: string): string {
  return `${classe}:::${grupo}:::${chave}`;
}

export default function ConfiguracoesPrecosPage() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [autorizado, setAutorizado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  const [overridesMap, setOverridesMap] = useState<Record<string, ConfiguracaoPrecoDTO>>({});
  const [edicoes, setEdicoes] = useState<Record<string, Record<string, number>>>({});
  const [salvando, setSalvando] = useState<Set<string>>(new Set());

  const [classeAtiva, setClasseAtiva] = useState<string>(ORDEM_CLASSES[0]);
  const gruposDaClasse = useMemo(
    () => REGISTRO_PRECOS.filter((g) => g.classe === classeAtiva),
    [classeAtiva]
  );
  const [grupoAtivo, setGrupoAtivo] = useState<string>(gruposDaClasse[0]?.grupo ?? "");

  useEffect(() => {
    setGrupoAtivo(gruposDaClasse[0]?.grupo ?? "");
  }, [classeAtiva, gruposDaClasse]);

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

        const precosResponse = await fetch("/api/configuracoes/precos");
        if (precosResponse.ok) {
          const configuracoes: ConfiguracaoPrecoDTO[] = await precosResponse.json();
          const mapa: Record<string, ConfiguracaoPrecoDTO> = {};
          for (const config of configuracoes) {
            mapa[chaveCompleta(config.classe, config.grupo, config.chave)] = config;
          }
          setOverridesMap(mapa);
        }
      } catch (err) {
        console.error(err);
        setErro("Erro ao carregar preços");
      } finally {
        setCarregando(false);
      }
    })();
  }, [router]);

  function dadosEfetivos(
    grupo: GrupoRegistroPreco,
    item: ItemRegistroPreco
  ): Record<string, number> {
    const key = chaveCompleta(grupo.classe, grupo.grupo, item.chave);
    const override = overridesMap[key];
    return { ...item.valoresPadrao, ...(override?.dados ?? {}) };
  }

  function valorExibido(
    grupo: GrupoRegistroPreco,
    item: ItemRegistroPreco,
    campo: string
  ): number {
    const key = chaveCompleta(grupo.classe, grupo.grupo, item.chave);
    if (edicoes[key] && campo in edicoes[key]) {
      return edicoes[key][campo];
    }
    return dadosEfetivos(grupo, item)[campo];
  }

  function temOverride(grupo: GrupoRegistroPreco, item: ItemRegistroPreco): boolean {
    return chaveCompleta(grupo.classe, grupo.grupo, item.chave) in overridesMap;
  }

  function temEdicaoPendente(grupo: GrupoRegistroPreco, item: ItemRegistroPreco): boolean {
    return chaveCompleta(grupo.classe, grupo.grupo, item.chave) in edicoes;
  }

  function onCampoChange(
    grupo: GrupoRegistroPreco,
    item: ItemRegistroPreco,
    campo: string,
    valor: string
  ) {
    const key = chaveCompleta(grupo.classe, grupo.grupo, item.chave);
    const numero = valor === "" ? 0 : Number(valor);
    setEdicoes((prev) => ({
      ...prev,
      [key]: { ...(prev[key] ?? dadosEfetivos(grupo, item)), [campo]: numero },
    }));
  }

  async function salvar(grupo: GrupoRegistroPreco, item: ItemRegistroPreco) {
    const key = chaveCompleta(grupo.classe, grupo.grupo, item.chave);
    const dados = edicoes[key] ?? dadosEfetivos(grupo, item);

    setSalvando((prev) => new Set(prev).add(key));
    setErro(null);

    try {
      const response = await fetch("/api/configuracoes/precos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classe: grupo.classe,
          grupo: grupo.grupo,
          chave: item.chave,
          nome: item.nome,
          dados,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Erro ao salvar preço");
      }

      setOverridesMap((prev) => ({ ...prev, [key]: data }));
      setEdicoes((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setSucesso(`Preço de "${item.nome}" atualizado.`);
      setTimeout(() => setSucesso(null), 3000);
    } catch (err: any) {
      setErro(err.message || "Erro ao salvar preço");
      setTimeout(() => setErro(null), 5000);
    } finally {
      setSalvando((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }

  async function restaurarPadrao(grupo: GrupoRegistroPreco, item: ItemRegistroPreco) {
    const key = chaveCompleta(grupo.classe, grupo.grupo, item.chave);

    setSalvando((prev) => new Set(prev).add(key));
    setErro(null);

    try {
      const params = new URLSearchParams({
        classe: grupo.classe,
        grupo: grupo.grupo,
        chave: item.chave,
      });
      const response = await fetch(`/api/configuracoes/precos?${params.toString()}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erro ao restaurar preço padrão");
      }

      setOverridesMap((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setEdicoes((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setSucesso(`Preço de "${item.nome}" restaurado ao padrão.`);
      setTimeout(() => setSucesso(null), 3000);
    } catch (err: any) {
      setErro(err.message || "Erro ao restaurar preço padrão");
      setTimeout(() => setErro(null), 5000);
    } finally {
      setSalvando((prev) => {
        const next = new Set(prev);
        next.delete(key);
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

  const grupo = gruposDaClasse.find((g) => g.grupo === grupoAtivo) ?? gruposDaClasse[0];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-military-900 mb-2">
          Configurações &gt; Preços
        </h1>
        <p className="text-olive-700">
          Preços e custos usados nos cálculos de despesa logística. Itens sem edição usam o
          valor padrão do sistema.
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

      {/* Abas por classe */}
      <div className="mb-4 flex flex-wrap gap-2 border-b border-olive-200 pb-3">
        {ORDEM_CLASSES.map((classe) => (
          <button
            key={classe}
            onClick={() => setClasseAtiva(classe)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              classeAtiva === classe
                ? "bg-military-600 text-white"
                : "bg-white text-olive-700 border border-olive-200 hover:bg-olive-50"
            }`}
          >
            {LABEL_CLASSE[classe] ?? classe}
          </button>
        ))}
      </div>

      {/* Sub-abas por grupo (só aparece quando a classe tem mais de 1 grupo, ex. Classe III) */}
      {gruposDaClasse.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {gruposDaClasse.map((g) => (
            <button
              key={g.grupo}
              onClick={() => setGrupoAtivo(g.grupo)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                grupoAtivo === g.grupo
                  ? "bg-olive-700 text-white"
                  : "bg-olive-100 text-olive-800 hover:bg-olive-200"
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      )}

      {grupo && (
        <div className="bg-white rounded-lg border border-olive-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-olive-200 bg-military-50">
            <h2 className="font-semibold text-military-900">{grupo.label}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-olive-50 border-b border-olive-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-military-900 uppercase tracking-wider">
                    Item
                  </th>
                  {grupo.campos.map((campo) => (
                    <th
                      key={campo.campo}
                      className="px-4 py-3 text-left text-xs font-semibold text-military-900 uppercase tracking-wider"
                    >
                      {campo.label}
                      {campo.sufixo ? ` (${campo.sufixo})` : ""}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-left text-xs font-semibold text-military-900 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-olive-100">
                {grupo.itens.map((item) => {
                  const customizado = temOverride(grupo, item);
                  const dirty = temEdicaoPendente(grupo, item);
                  const key = chaveCompleta(grupo.classe, grupo.grupo, item.chave);
                  const estaSalvando = salvando.has(key);

                  return (
                    <tr key={item.chave} className="hover:bg-olive-50 transition-colors">
                      <td className="px-6 py-3">
                        <div className="font-medium text-military-900">{item.nome}</div>
                        {customizado && (
                          <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-military-100 text-military-800">
                            customizado
                          </span>
                        )}
                      </td>
                      {grupo.campos.map((campo) => (
                        <td key={campo.campo} className="px-4 py-3">
                          <input
                            type="number"
                            step="0.01"
                            value={valorExibido(grupo, item, campo.campo)}
                            onChange={(e) =>
                              onCampoChange(grupo, item, campo.campo, e.target.value)
                            }
                            className="w-28 px-2 py-1.5 border border-olive-300 rounded-md focus:outline-none focus:ring-2 focus:ring-military-500 focus:border-transparent"
                          />
                        </td>
                      ))}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {dirty && (
                            <Button
                              size="sm"
                              onClick={() => salvar(grupo, item)}
                              disabled={estaSalvando}
                              className="flex items-center gap-1"
                            >
                              <Save className="w-3.5 h-3.5" />
                              Salvar
                            </Button>
                          )}
                          {customizado && !dirty && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => restaurarPadrao(grupo, item)}
                              disabled={estaSalvando}
                              className="flex items-center gap-1"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              Restaurar padrão
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
