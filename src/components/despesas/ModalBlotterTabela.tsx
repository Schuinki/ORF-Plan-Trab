"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import {
  Zap,
  Plus,
  Trash2,
  X,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { getClasseNome } from "@/lib/classes";
import {
  camposVisiveis,
  campoAplicavel,
  valoresPadraoParaClasse,
  opcoesItemEspecificoParaClasse,
  calcularLinhaBlotter,
  type CampoDef,
  type ContextoBlotter,
} from "@/lib/blotter/blotterCalculo";
import { fetchPrecosCombustivel, type PrecosCombustivelAPI } from "@/lib/calculos/classeIII";
import type {
  ClasseSelect,
  NaturezaSelect,
  OMSelect,
  OperacaoWithEfetivo,
  UserOM,
} from "@/types/despesas";

interface TipoLike {
  id: string;
  nome: string;
  isCombustivel: boolean;
}

interface ItemOpcao {
  id: string;
  label: string;
  classeId: string;
  classeNome: string;
  tipoId: string | null;
  tipoNome: string | null;
}

interface LinhaBlotter {
  rowId: string;
  itemTexto: string;
  itemId: string;
  classeId: string;
  classeNome: string;
  tipoId: string | null;
  tipoNome: string | null;
  valores: Record<string, string>;
  naturezaId: string;
  omDestinoId: string;
  omCompradoraId: string;
  mesmaOmCompradora: boolean;
  valorTotal: number;
  valorCombustivel?: number;
  descricao: string;
  parametrosReais: unknown;
  erroCalculo?: string;
  erro?: string;
  carimboAberto: boolean;
}

interface ModalBlotterTabelaProps {
  isOpen: boolean;
  onClose: () => void;
  planoId: string;
  oms: OMSelect[];
  loadingOms?: boolean;
  operacao: OperacaoWithEfetivo;
  onSuccess: () => void;
  userOm: UserOM | null;
  planoOm: UserOM | null;
}

let proximoRowId = 0;
function novoRowId() {
  proximoRowId += 1;
  return `linha-${proximoRowId}`;
}

function linhaVazia(): LinhaBlotter {
  return {
    rowId: novoRowId(),
    itemTexto: "",
    itemId: "",
    classeId: "",
    classeNome: "",
    tipoId: null,
    tipoNome: null,
    valores: {},
    naturezaId: "",
    omDestinoId: "",
    omCompradoraId: "",
    mesmaOmCompradora: true,
    valorTotal: 0,
    descricao: "",
    parametrosReais: null,
    carimboAberto: false,
  };
}

export function ModalBlotterTabela({
  isOpen,
  onClose,
  planoId,
  oms,
  loadingOms,
  operacao,
  onSuccess,
  planoOm,
}: ModalBlotterTabelaProps) {
  const [classes, setClasses] = useState<ClasseSelect[]>([]);
  const [naturezas, setNaturezas] = useState<NaturezaSelect[]>([]);
  const [itens, setItens] = useState<ItemOpcao[]>([]);
  const [tiposPorClasseId, setTiposPorClasseId] = useState<Record<string, TipoLike[]>>({});
  const [precosCombustivel, setPrecosCombustivel] = useState<PrecosCombustivelAPI | null>(null);
  const [loadingDados, setLoadingDados] = useState(true);
  const [linhas, setLinhas] = useState<LinhaBlotter[]>([linhaVazia()]);
  const [enviando, setEnviando] = useState(false);
  const [erroGeral, setErroGeral] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setLinhas([linhaVazia()]);
    setErroGeral("");
    const carregar = async () => {
      try {
        setLoadingDados(true);
        const [classesRes, naturezasRes, precos] = await Promise.all([
          fetch("/api/classes"),
          fetch("/api/naturezas"),
          fetchPrecosCombustivel(),
        ]);
        const classesData: ClasseSelect[] = classesRes.ok ? await classesRes.json() : [];
        const naturezasData: NaturezaSelect[] = naturezasRes.ok ? await naturezasRes.json() : [];
        setClasses(classesData);
        setNaturezas(naturezasData);
        setPrecosCombustivel(precos);

        const tiposPorClasseRes = await Promise.all(
          classesData.map((c) =>
            fetch(`/api/classes/${c.id}/tipos`).then((r) =>
              r.ok ? (r.json() as Promise<TipoLike[]>) : []
            )
          )
        );

        const tiposMap: Record<string, TipoLike[]> = {};
        const itensMontados: ItemOpcao[] = [];
        classesData.forEach((classe, idx) => {
          const tipos = tiposPorClasseRes[idx];
          tiposMap[classe.id] = tipos;
          if (tipos.length === 0) {
            itensMontados.push({
              id: `${classe.id}:SEM_TIPO`,
              label: `${getClasseNome(classe.nome)} (${classe.descricao})`,
              classeId: classe.id,
              classeNome: classe.nome,
              tipoId: null,
              tipoNome: null,
            });
          } else {
            tipos.forEach((tipo) => {
              itensMontados.push({
                id: `${classe.id}:${tipo.id}`,
                label: `${getClasseNome(classe.nome)} - ${tipo.nome}`,
                classeId: classe.id,
                classeNome: classe.nome,
                tipoId: tipo.id,
                tipoNome: tipo.nome,
              });
            });
          }
        });
        setTiposPorClasseId(tiposMap);
        setItens(itensMontados);
      } catch (error) {
        console.error("Erro ao carregar dados do blotter:", error);
      } finally {
        setLoadingDados(false);
      }
    };
    carregar();
  }, [isOpen]);

  const classePorId = (classeId: string) => classes.find((c) => c.id === classeId);

  const naturezasPermitidasDaLinha = (linha: LinhaBlotter): NaturezaSelect[] => {
    const classe = classePorId(linha.classeId);
    if (!classe) return [];
    return naturezas.filter((n) => classe.naturezasPermitidas.includes(n.codigo));
  };

  const contextoCampos: ContextoBlotter = useMemo(
    () => ({
      tipoNome: null,
      precosCombustivel,
      diasOperacaoPadrao: operacao.diasTotais,
      efetivoPadrao: operacao.efetivo,
    }),
    [precosCombustivel, operacao.diasTotais, operacao.efetivo]
  );

  const recalcularLinha = (linha: LinhaBlotter): LinhaBlotter => {
    if (!linha.classeNome) {
      return {
        ...linha,
        valorTotal: 0,
        valorCombustivel: undefined,
        descricao: "",
        parametrosReais: null,
        erroCalculo: undefined,
      };
    }
    const naturezaSelecionada = naturezas.find((n) => n.id === linha.naturezaId);
    try {
      const resultado = calcularLinhaBlotter(linha.classeNome, linha.tipoNome, linha.valores, {
        unidade: planoOm?.sigla,
        nomeOperacao: operacao.nome,
        naturezasCodigos: naturezaSelecionada ? [naturezaSelecionada.codigo] : [],
        precosCombustivel,
      });
      return {
        ...linha,
        valorTotal: resultado.valorTotal,
        valorCombustivel: resultado.valorCombustivel,
        descricao: resultado.descricao,
        parametrosReais: resultado.parametros,
        erroCalculo: undefined,
      };
    } catch (error) {
      return {
        ...linha,
        valorTotal: 0,
        valorCombustivel: undefined,
        descricao: "",
        parametrosReais: null,
        erroCalculo: error instanceof Error ? error.message : "Erro no cálculo",
      };
    }
  };

  if (!isOpen) return null;

  const handleItemTextoChange = (rowId: string, texto: string) => {
    const match = itens.find((i) => i.label.toLowerCase() === texto.trim().toLowerCase());
    setLinhas((prev) =>
      prev.map((l) => {
        if (l.rowId !== rowId) return l;
        if (!match) {
          return recalcularLinha({
            ...l,
            itemTexto: texto,
            itemId: "",
            classeId: "",
            classeNome: "",
            tipoId: null,
            tipoNome: null,
            erro: undefined,
          });
        }
        const classeMudou = match.classeId !== l.classeId;
        const classe = classePorId(match.classeId);
        const naturezasPermitidas = classe
          ? naturezas.filter((n) => classe.naturezasPermitidas.includes(n.codigo))
          : [];
        const novaLinha: LinhaBlotter = {
          ...l,
          itemTexto: texto,
          itemId: match.id,
          classeId: match.classeId,
          classeNome: match.classeNome,
          tipoId: match.tipoId,
          tipoNome: match.tipoNome,
          valores: classeMudou
            ? valoresPadraoParaClasse(match.classeNome, contextoCampos)
            : l.valores,
          naturezaId: classeMudou
            ? naturezasPermitidas[0]?.id || ""
            : l.naturezaId,
          erro: undefined,
        };
        return recalcularLinha(novaLinha);
      })
    );
  };

  const handleCampoChange = (rowId: string, campoKey: string, valor: string) => {
    setLinhas((prev) =>
      prev.map((l) => {
        if (l.rowId !== rowId) return l;
        const novosValores = { ...l.valores, [campoKey]: valor };
        // Trocar o subtipo (Classe II) ou o item específico reseta os
        // valores que só fazem sentido para a opção anterior.
        if (campoKey === "subtipo" || campoKey === "itemEspecifico") {
          delete novosValores.nomeCustomizado;
          delete novosValores.grupoCustomizado;
        }
        return recalcularLinha({ ...l, valores: novosValores, erro: undefined });
      })
    );
  };

  const handleNaturezaChange = (rowId: string, naturezaId: string) => {
    setLinhas((prev) =>
      prev.map((l) => (l.rowId === rowId ? recalcularLinha({ ...l, naturezaId, erro: undefined }) : l))
    );
  };

  const handleOmDestinoChange = (rowId: string, omDestinoId: string) => {
    setLinhas((prev) =>
      prev.map((l) => (l.rowId === rowId ? { ...l, omDestinoId, erro: undefined } : l))
    );
  };

  const handleToggleMesmaOm = (rowId: string, mesmaOm: boolean) => {
    setLinhas((prev) =>
      prev.map((l) =>
        l.rowId === rowId
          ? { ...l, mesmaOmCompradora: mesmaOm, omCompradoraId: mesmaOm ? "" : l.omCompradoraId }
          : l
      )
    );
  };

  const handleOmCompradoraChange = (rowId: string, omCompradoraId: string) => {
    setLinhas((prev) =>
      prev.map((l) => (l.rowId === rowId ? { ...l, omCompradoraId, erro: undefined } : l))
    );
  };

  const toggleCarimbo = (rowId: string) => {
    setLinhas((prev) =>
      prev.map((l) => (l.rowId === rowId ? { ...l, carimboAberto: !l.carimboAberto } : l))
    );
  };

  const handleAddLinha = () => {
    setLinhas((prev) => [...prev, linhaVazia()]);
  };

  const handleRemoveLinha = (rowId: string) => {
    setLinhas((prev) => prev.filter((l) => l.rowId !== rowId));
  };

  const handleSubmit = async () => {
    const linhasComConteudo = linhas.filter((l) => l.itemTexto.trim() || l.omDestinoId);
    if (linhasComConteudo.length === 0) {
      setErroGeral("Preencha ao menos uma linha antes de lançar.");
      return;
    }

    setEnviando(true);
    setErroGeral("");

    const sucedidas: string[] = [];
    const comErro: LinhaBlotter[] = [];

    for (const linha of linhasComConteudo) {
      const erro = await processarLinha(linha);
      if (erro) {
        comErro.push({ ...linha, erro, carimboAberto: true });
      } else {
        sucedidas.push(linha.rowId);
      }
    }

    async function processarLinha(linha: LinhaBlotter): Promise<string | null> {
      if (!linha.classeId) return "Selecione um item válido do catálogo.";
      if (!linha.omDestinoId) return "Selecione a OM de destino.";
      if (!linha.mesmaOmCompradora && !linha.omCompradoraId) return "Selecione a OM compradora.";
      if (!linha.naturezaId) return "Selecione a Natureza de Despesa.";
      if (linha.erroCalculo) return linha.erroCalculo;
      if (!linha.descricao || linha.valorTotal <= 0) return "Preencha os parâmetros da despesa.";

      try {
        const response = await fetch(`/api/planos/${planoId}/despesas`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            classeId: linha.classeId,
            tipoId: linha.tipoId,
            descricao: linha.descricao,
            parametros: linha.parametrosReais,
            oms: [
              {
                omDestinoId: linha.omDestinoId,
                omCompradoraId: linha.mesmaOmCompradora ? linha.omDestinoId : linha.omCompradoraId,
                percentual: 100,
              },
            ],
            naturezas: [{ naturezaId: linha.naturezaId, percentual: 100 }],
            valorTotal: linha.valorTotal,
            valorCombustivel: linha.valorCombustivel,
          }),
        });
        if (!response.ok) {
          const err = await response.json();
          return err.error || "Erro ao criar despesa";
        }
        return null;
      } catch (error) {
        console.error("Erro ao criar despesa via blotter:", error);
        return "Erro de rede ao criar despesa";
      }
    }

    setLinhas((prev) => {
      const restantes = prev.filter((l) => !sucedidas.includes(l.rowId));
      return restantes.map((l) => {
        const comErroEncontrada = comErro.find((e) => e.rowId === l.rowId);
        return comErroEncontrada ? { ...l, erro: comErroEncontrada.erro, carimboAberto: true } : l;
      });
    });

    if (sucedidas.length > 0) onSuccess();
    if (comErro.length === 0) {
      onClose();
    } else {
      setErroGeral(
        `${sucedidas.length} despesa(s) lançada(s). ${comErro.length} linha(s) com erro — corrija e tente novamente.`
      );
    }
    setEnviando(false);
  };

  const classesPresentes = Array.from(new Set(linhas.map((l) => l.classeNome).filter(Boolean)));
  const colunasDinamicas = camposVisiveis(classesPresentes);
  const totalColunas = 4 + colunasDinamicas.length + 3; // item+om+natureza+valor + dinâmicas + carimbo+remover... aproximado p/ colSpan

  const renderCelulaCampo = (linha: LinhaBlotter, campo: CampoDef) => {
    const aplicavel = campoAplicavel(campo.key, linha.classeNome, linha.valores);
    if (!aplicavel) {
      return (
        <td key={campo.key} className="p-1.5 border-r border-gray-100 bg-gray-50">
          <input disabled value="" readOnly className="w-full px-2 py-1.5 border border-gray-200 rounded-md text-sm bg-gray-100" />
        </td>
      );
    }

    if (campo.tipo === "select") {
      const opcoes =
        campo.key === "itemEspecifico"
          ? opcoesItemEspecificoParaClasse(linha.classeNome, { ...contextoCampos, tipoNome: linha.tipoNome }, linha.valores)
          : campo.opcoes?.({ ...contextoCampos, tipoNome: linha.tipoNome }, linha.valores) || [];
      return (
        <td key={campo.key} className="p-1.5 border-r border-gray-100">
          <select
            value={linha.valores[campo.key] || ""}
            onChange={(e) => handleCampoChange(linha.rowId, campo.key, e.target.value)}
            className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm"
          >
            <option value="">Selecione</option>
            {opcoes.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </td>
      );
    }

    return (
      <td key={campo.key} className="p-1.5 border-r border-gray-100">
        <input
          type={campo.tipo === "number" ? "number" : "text"}
          value={linha.valores[campo.key] || ""}
          onChange={(e) => handleCampoChange(linha.rowId, campo.key, e.target.value)}
          placeholder={campo.placeholder}
          className={`w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm ${
            campo.tipo === "number" ? "text-right" : ""
          }`}
        />
      </td>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-[98vw] w-full max-h-[94vh] flex flex-col">
        <div className="flex items-center justify-between p-4 sm:p-6 pb-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-military-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Entrada Rápida — Lançamento em Lote
            </h3>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-auto p-4 sm:p-6 flex-1">
          <p className="text-xs text-gray-500 mb-2">
            Digite o item para resolver a Classe/Tipo — as colunas específicas daquela Classe
            aparecem automaticamente. Colunas que não se aplicam ao item da linha ficam
            travadas (vazias).
          </p>
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="text-sm border-collapse w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left p-2 font-medium text-gray-700 border-r border-gray-200" style={{ minWidth: 220 }}>
                    Item
                  </th>
                  <th className="text-left p-2 font-medium text-gray-700 border-r border-gray-200" style={{ minWidth: 170 }}>
                    OM (destino / compradora)
                  </th>
                  <th className="text-left p-2 font-medium text-gray-700 border-r border-gray-200" style={{ minWidth: 140 }}>
                    Natureza
                  </th>
                  {colunasDinamicas.map((campo) => (
                    <th
                      key={campo.key}
                      className="text-left p-2 font-medium text-gray-700 border-r border-gray-200"
                      style={{ minWidth: 150 }}
                    >
                      {campo.label}
                    </th>
                  ))}
                  <th className="text-right p-2 font-medium text-gray-700 border-r border-gray-200" style={{ minWidth: 110 }}>
                    Valor Total
                  </th>
                  <th className="p-2 border-r border-gray-200" style={{ minWidth: 50 }}>
                    Carimbo
                  </th>
                  <th className="p-2 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((linha) => {
                  const naturezasPermitidas = naturezasPermitidasDaLinha(linha);
                  return (
                    <Fragment key={linha.rowId}>
                      <tr className="border-b border-gray-100 align-top">
                        <td className="p-1.5 border-r border-gray-100">
                          <input
                            type="text"
                            list="itens-blotter-tabela"
                            value={linha.itemTexto}
                            onChange={(e) => handleItemTextoChange(linha.rowId, e.target.value)}
                            placeholder="Digite o item..."
                            disabled={loadingDados}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm"
                          />
                          {linha.classeNome && (
                            <p className="text-[11px] text-military-700 mt-0.5">
                              {getClasseNome(linha.classeNome)}
                            </p>
                          )}
                        </td>
                        <td className="p-1.5 border-r border-gray-100">
                          <select
                            value={linha.omDestinoId}
                            onChange={(e) => handleOmDestinoChange(linha.rowId, e.target.value)}
                            disabled={loadingOms}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm"
                          >
                            <option value="">{loadingOms ? "Carregando..." : "Selecione"}</option>
                            {oms.map((om) => (
                              <option key={om.id} value={om.id}>
                                {om.sigla}
                              </option>
                            ))}
                          </select>
                          <label className="flex items-center gap-1 text-[11px] text-gray-500 mt-1">
                            <input
                              type="checkbox"
                              checked={linha.mesmaOmCompradora}
                              onChange={(e) => handleToggleMesmaOm(linha.rowId, e.target.checked)}
                            />
                            compradora = destino
                          </label>
                          {!linha.mesmaOmCompradora && (
                            <select
                              value={linha.omCompradoraId}
                              onChange={(e) => handleOmCompradoraChange(linha.rowId, e.target.value)}
                              disabled={loadingOms}
                              className="w-full mt-1 px-2 py-1 border border-gray-300 rounded-md text-xs"
                            >
                              <option value="">OM compradora</option>
                              {oms.map((om) => (
                                <option key={om.id} value={om.id}>
                                  {om.sigla}
                                </option>
                              ))}
                            </select>
                          )}
                        </td>
                        <td className="p-1.5 border-r border-gray-100">
                          {naturezasPermitidas.length > 0 ? (
                            <select
                              value={linha.naturezaId}
                              onChange={(e) => handleNaturezaChange(linha.rowId, e.target.value)}
                              disabled={naturezasPermitidas.length === 1}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm disabled:bg-gray-100"
                            >
                              <option value="">Selecione</option>
                              {naturezasPermitidas.map((n) => (
                                <option key={n.id} value={n.id}>
                                  {n.codigo}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input disabled value="" readOnly className="w-full px-2 py-1.5 border border-gray-200 rounded-md text-sm bg-gray-100" />
                          )}
                        </td>
                        {colunasDinamicas.map((campo) => renderCelulaCampo(linha, campo))}
                        <td className="p-1.5 border-r border-gray-100 text-right font-medium text-gray-900 whitespace-nowrap">
                          {linha.valorTotal > 0
                            ? linha.valorTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                            : "—"}
                        </td>
                        <td className="p-1.5 border-r border-gray-100 text-center">
                          <button
                            type="button"
                            onClick={() => toggleCarimbo(linha.rowId)}
                            className="p-1 text-gray-500 hover:bg-gray-100 rounded"
                            title="Ver carimbo gerado"
                          >
                            {linha.carimboAberto ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          {linha.erro && <AlertCircle className="w-4 h-4 text-red-500 mx-auto mt-1" />}
                        </td>
                        <td className="p-1.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveLinha(linha.rowId)}
                            className="p-1 text-red-500 hover:bg-red-50 rounded"
                            title="Remover linha"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                      {linha.carimboAberto && (
                        <tr key={`${linha.rowId}-carimbo`} className="border-b border-gray-100 bg-gray-50">
                          <td colSpan={totalColunas} className="p-3">
                            {linha.erro && (
                              <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md mb-2">
                                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                <span>{linha.erro}</span>
                              </div>
                            )}
                            {linha.erroCalculo && !linha.descricao && (
                              <p className="text-xs text-amber-700 mb-2">
                                Ainda não é possível gerar o carimbo: {linha.erroCalculo}
                              </p>
                            )}
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Carimbo (automático, idêntico ao gerado em &quot;Nova Despesa&quot;)
                            </label>
                            <textarea
                              value={linha.descricao}
                              disabled
                              rows={6}
                              placeholder="Preenchido automaticamente conforme os campos acima..."
                              className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs resize-y bg-white text-gray-700 font-mono"
                            />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
            <datalist id="itens-blotter-tabela">
              {itens.map((item) => (
                <option key={item.id} value={item.label} />
              ))}
            </datalist>
          </div>

          <button
            type="button"
            onClick={handleAddLinha}
            className="mt-3 w-full px-3 py-2 border-2 border-dashed border-gray-300 rounded-md text-sm text-gray-600 hover:border-military-500 hover:text-military-700 hover:bg-military-50 transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Adicionar linha
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 sm:p-6 pt-4 border-t border-gray-200">
          <div className="flex-1">
            {erroGeral && (
              <div className="flex items-center gap-2 text-sm text-amber-700">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{erroGeral}</span>
              </div>
            )}
          </div>
          <div className="flex flex-col-reverse sm:flex-row gap-2">
            <Button variant="outline" onClick={onClose} disabled={enviando}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleSubmit} isLoading={enviando}>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Lançar Despesas
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
