"use client";

import { useState, useEffect } from "react";
import { X, Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { HelpTooltip } from "@/components/ui/HelpTooltip";
import type { OMSelect, UserOM } from "@/types/despesas";
import type { DespesaOperacional } from "./DespesasOperacionais";

interface NaturezaOperacional {
  id: string;
  codigo: string;
  nome: string;
  gnd: string;
}

interface NaturezaValor {
  naturezaId: string;
  valor: number;
}

const TITULOS_SUGERIDOS = [
  "DIÁRIA",
  "PASSAGEM AÉREA/RODOVIÁRIA",
  "SUPRIMENTO DE FUNDOS",
  "SERVIÇO DE TERCEIROS (LOCAÇÃO DE VEÍCULO)",
  "SERVIÇOS DE TERCEIROS (FRETAMENTO)",
  "SERVIÇO DE TERCEIROS (MANUTENÇÃO)",
  "SERVIÇO DE TERCEIROS (LICENÇA SOFTWARE)",
  "MATERIAL DE CONSUMO",
  "MATERIAL DE CONSUMO (MATERIAL DE EXPEDIENTE)",
  "ALIMENTAÇÃO DE AGENTES",
  "ENERGIA ELÉTRICA",
];

const SITUACOES_PREGAO = [
  { value: "PARTICIPANTE", label: "Participante do Pregão" },
  { value: "ADESAO_CARONA", label: "Adesão / Carona" },
  { value: "DISPENSA", label: "Dispensa de Licitação" },
  { value: "INEXIGIBILIDADE", label: "Inexigibilidade" },
  { value: "OUTRO", label: "Outro" },
];

interface ModalCriarDespesaOperacionalProps {
  isOpen: boolean;
  onClose: () => void;
  planoId: string;
  planoTipo: "OPERACIONAL_GND3" | "OPERACIONAL_GND4";
  oms: OMSelect[];
  loadingOms?: boolean;
  onSuccess: (omsAdicionadas?: { id: string; sigla: string }[]) => void;
  despesaToEdit?: DespesaOperacional | null;
  userOm: UserOM | null;
  planoOm: UserOM | null;
}

export function ModalCriarDespesaOperacional({
  isOpen,
  onClose,
  planoId,
  planoTipo,
  oms,
  loadingOms,
  onSuccess,
  despesaToEdit = null,
}: ModalCriarDespesaOperacionalProps) {
  const [loading, setLoading] = useState(false);
  const [loadingNaturezas, setLoadingNaturezas] = useState(true);
  const [naturezas, setNaturezas] = useState<NaturezaOperacional[]>([]);
  const gndDoPlano = planoTipo === "OPERACIONAL_GND4" ? "GND 4" : "GND 3";

  const [omDestinoId, setOmDestinoId] = useState("");
  const [omCompradoraId, setOmCompradoraId] = useState("");
  const [mesmaOmCompradora, setMesmaOmCompradora] = useState(true);
  const [titulo, setTitulo] = useState("");
  const [objeto, setObjeto] = useState("");
  const [objetivo, setObjetivo] = useState("");
  const [finalidade, setFinalidade] = useState("");
  const [memoriaCalculo, setMemoriaCalculo] = useState("");
  const [pregaoUasg, setPregaoUasg] = useState("");
  const [situacaoPregao, setSituacaoPregao] = useState("");
  const [observacaoPregao, setObservacaoPregao] = useState("");
  const [naturezasValor, setNaturezasValor] = useState<NaturezaValor[]>([]);

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      carregarNaturezas();

      if (despesaToEdit) {
        setOmDestinoId(despesaToEdit.omDestino.id);
        setOmCompradoraId(despesaToEdit.omCompradora.id);
        setMesmaOmCompradora(
          despesaToEdit.omCompradora.id === despesaToEdit.omDestino.id
        );
        setTitulo(despesaToEdit.titulo);
        setObjeto(despesaToEdit.objeto || "");
        setObjetivo(despesaToEdit.objetivo || "");
        setFinalidade(despesaToEdit.finalidade || "");
        setMemoriaCalculo(despesaToEdit.memoriaCalculo);
        setPregaoUasg(despesaToEdit.pregaoUasg || "");
        setSituacaoPregao(despesaToEdit.situacaoPregao || "");
        setObservacaoPregao(despesaToEdit.observacaoPregao || "");
        setNaturezasValor(
          despesaToEdit.naturezas.map((n) => ({
            naturezaId: n.naturezaId,
            valor: Number(n.valor),
          }))
        );
      } else {
        resetForm();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, despesaToEdit]);

  const carregarNaturezas = async () => {
    try {
      setLoadingNaturezas(true);
      const response = await fetch("/api/naturezas");
      if (response.ok) {
        const data = await response.json();
        setNaturezas(data);
      }
    } catch (error) {
      console.error("Erro ao carregar naturezas:", error);
    } finally {
      setLoadingNaturezas(false);
    }
  };

  const resetForm = () => {
    setOmDestinoId("");
    setOmCompradoraId("");
    setMesmaOmCompradora(true);
    setTitulo("");
    setObjeto("");
    setObjetivo("");
    setFinalidade("");
    setMemoriaCalculo("");
    setPregaoUasg("");
    setSituacaoPregao("");
    setObservacaoPregao("");
    setNaturezasValor([]);
    setErrors({});
  };

  const naturezasDisponiveis = (naturezaIdAtual?: string) => {
    const usadas = naturezasValor
      .map((n) => n.naturezaId)
      .filter((id) => id && id !== naturezaIdAtual);
    return naturezas.filter(
      (n) => n.gnd === gndDoPlano && !usadas.includes(n.id)
    );
  };

  const handleAddNatureza = () => {
    if (naturezasValor.some((n) => !n.naturezaId)) return;
    setNaturezasValor([...naturezasValor, { naturezaId: "", valor: 0 }]);
  };

  const handleRemoveNatureza = (index: number) => {
    setNaturezasValor(naturezasValor.filter((_, i) => i !== index));
  };

  const handleNaturezaChange = (index: number, naturezaId: string) => {
    const novo = [...naturezasValor];
    novo[index] = { ...novo[index], naturezaId };
    setNaturezasValor(novo);
  };

  const handleValorChange = (index: number, texto: string) => {
    const valor = texto === "" ? 0 : Number(texto.replace(",", "."));
    if (Number.isNaN(valor) || valor < 0) return;
    const novo = [...naturezasValor];
    novo[index] = { ...novo[index], valor };
    setNaturezasValor(novo);
  };

  const totalDespesa = naturezasValor.reduce(
    (sum, n) => sum + Number(n.valor || 0),
    0
  );

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!omDestinoId) newErrors.omId = "Selecione a OM (UGE) responsável";
    if (!mesmaOmCompradora && !omCompradoraId)
      newErrors.omId = "Selecione a OM compradora";
    if (!titulo.trim()) newErrors.titulo = "Informe o título da despesa";
    if (!memoriaCalculo.trim())
      newErrors.memoriaCalculo = "Informe a memória de cálculo";

    if (naturezasValor.length === 0)
      newErrors.naturezas = "Adicione ao menos uma Natureza de Despesa";
    else if (naturezasValor.some((n) => !n.naturezaId))
      newErrors.naturezas = "Selecione a ND em todas as linhas";
    else if (totalDespesa <= 0)
      newErrors.naturezas = "Informe ao menos um valor maior que zero";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setLoading(true);
      const isEditing = !!despesaToEdit;
      const url = isEditing
        ? `/api/planos/${planoId}/despesas-operacionais/${despesaToEdit.id}`
        : `/api/planos/${planoId}/despesas-operacionais`;
      const method = isEditing ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          omDestinoId,
          omCompradoraId: mesmaOmCompradora ? omDestinoId : omCompradoraId,
          titulo: titulo.trim(),
          objeto: objeto.trim() || undefined,
          objetivo: objetivo.trim() || undefined,
          finalidade: finalidade.trim() || undefined,
          memoriaCalculo: memoriaCalculo.trim(),
          pregaoUasg: pregaoUasg.trim() || undefined,
          situacaoPregao: situacaoPregao || undefined,
          observacaoPregao: observacaoPregao.trim() || undefined,
          naturezas: naturezasValor,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        onSuccess(data.omsAdicionadas);
        onClose();
        resetForm();
      } else {
        const error = await response.json();
        alert(
          error.error || `Erro ao ${isEditing ? "editar" : "criar"} despesa`
        );
      }
    } catch (error) {
      console.error("Erro ao salvar despesa operacional:", error);
      alert("Erro ao salvar despesa");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 overflow-y-auto py-4 sm:py-8">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 my-0 sm:my-8">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">
            {despesaToEdit
              ? "Editar Despesa Operacional"
              : "Nova Despesa Operacional"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
            disabled={loading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="px-4 sm:px-6 py-4 space-y-5 max-h-[calc(100vh-200px)] overflow-y-auto"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              OM (UGE) <span className="text-red-500">*</span>
            </label>
            {loadingOms ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
              </div>
            ) : (
              <select
                value={omDestinoId}
                onChange={(e) => {
                  const novoDestino = e.target.value;
                  setOmDestinoId(novoDestino);
                  if (mesmaOmCompradora) setOmCompradoraId(novoDestino);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-600 focus:border-transparent"
              >
                <option value="">Selecione uma OM</option>
                {oms.map((om) => (
                  <option key={om.id} value={om.id}>
                    {om.sigla} - {om.nome} (UG: {om.codUG})
                  </option>
                ))}
              </select>
            )}
            {errors.omId && (
              <p className="text-sm text-red-600 mt-1">{errors.omId}</p>
            )}

            <label className="flex items-center gap-2 text-xs text-gray-600 mt-2">
              <input
                type="checkbox"
                checked={mesmaOmCompradora}
                onChange={(e) => {
                  setMesmaOmCompradora(e.target.checked);
                  if (e.target.checked) setOmCompradoraId(omDestinoId);
                }}
              />
              A OM compradora (CODUG do empenho) é a mesma OM destino
            </label>

            {!mesmaOmCompradora && (
              <div className="mt-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  OM compradora (CODUG usado na DOR/empenho)
                </label>
                <select
                  value={omCompradoraId}
                  onChange={(e) => setOmCompradoraId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-600 focus:border-transparent text-sm"
                >
                  <option value="">Selecione a OM compradora</option>
                  {oms.map((om) => (
                    <option key={om.id} value={om.id}>
                      {om.sigla} - {om.nome} (UG: {om.codUG})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Título da Despesa <span className="text-red-500">*</span>
            </label>
            <input
              list="titulos-sugeridos"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: DIÁRIA, PASSAGEM AÉREA/RODOVIÁRIA..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-600 focus:border-transparent"
            />
            <datalist id="titulos-sugeridos">
              {TITULOS_SUGERIDOS.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
            {errors.titulo && (
              <p className="text-sm text-red-600 mt-1">{errors.titulo}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Objeto
              </label>
              <textarea
                value={objeto}
                onChange={(e) => setObjeto(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-600 focus:border-transparent text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Objetivo
              </label>
              <textarea
                value={objetivo}
                onChange={(e) => setObjetivo(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-600 focus:border-transparent text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Finalidade
              </label>
              <textarea
                value={finalidade}
                onChange={(e) => setFinalidade(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-600 focus:border-transparent text-sm"
              />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1">
              Memória de Cálculo <span className="text-red-500">*</span>
              <HelpTooltip>
                Mostre como chegou no valor: quantidade x valor unitário,
                número de militares x diárias, etc. É o que vai justificar a
                despesa para quem aprovar o plano.
              </HelpTooltip>
            </label>
            <textarea
              value={memoriaCalculo}
              onChange={(e) => setMemoriaCalculo(e.target.value)}
              rows={4}
              placeholder="Discriminar efetivos, quantidades, valores unitários e totais..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-600 focus:border-transparent text-sm"
            />
            {errors.memoriaCalculo && (
              <p className="text-sm text-red-600 mt-1">
                {errors.memoriaCalculo}
              </p>
            )}
          </div>

          {/* Naturezas de Despesa (ND) */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                Naturezas de Despesa (ND) <span className="text-red-500">*</span>
                <HelpTooltip>
                  Natureza de Despesa é só o código orçamentário que diz com
                  o que o dinheiro vai ser gasto (ex: 33.90.30 = material de
                  consumo, 33.90.33 = passagens). Uma mesma despesa pode ter
                  valor em mais de uma ND. O GND entre parênteses (GND 3 =
                  custeio, GND 4 = material permanente) é só o grupo maior a
                  que essa ND pertence.
                </HelpTooltip>
              </label>
              {totalDespesa > 0 && (
                <span className="text-sm font-semibold text-green-700">
                  Total:{" "}
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(totalDespesa)}
                </span>
              )}
            </div>

            <div className="space-y-2">
              {naturezasValor.map((nv, index) => (
                <div key={index} className="flex flex-col sm:flex-row gap-2 sm:items-start">
                  <div className="flex-1">
                    <select
                      value={nv.naturezaId}
                      onChange={(e) =>
                        handleNaturezaChange(index, e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-600 focus:border-transparent text-sm"
                    >
                      <option value="">Selecione uma ND</option>
                      {naturezasDisponiveis(nv.naturezaId).map((n) => (
                        <option key={n.id} value={n.id}>
                          {n.codigo} - {n.nome} ({n.gnd})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2 sm:contents">
                    <div className="flex-1 sm:w-36 sm:flex-initial">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={nv.valor ? String(nv.valor) : ""}
                        onChange={(e) =>
                          handleValorChange(index, e.target.value)
                        }
                        placeholder="0,00"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-600 focus:border-transparent text-sm"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveNatureza(index)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              {loadingNaturezas ? (
                <div className="flex items-center justify-center py-2">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleAddNatureza}
                  disabled={naturezasValor.some((n) => !n.naturezaId)}
                  className="w-full px-3 py-2 border-2 border-dashed border-gray-300 rounded-md text-sm text-gray-600 hover:border-green-600 hover:text-green-700 hover:bg-green-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar Natureza de Despesa
                </button>
              )}
            </div>
            {errors.naturezas && (
              <p className="text-sm text-red-600 mt-1">{errors.naturezas}</p>
            )}
          </div>

          {/* Pregão / UASG */}
          <div className="border-t pt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1">
                Pregão / UASG
                <HelpTooltip>
                  Informe o número do pregão (licitação) e o código da UASG
                  (a unidade gestora) usados para comprar/contratar isso. Se
                  não houve pregão (ex: compra direta), pode deixar em branco
                  e explicar na Situação ao lado.
                </HelpTooltip>
              </label>
              <input
                type="text"
                value={pregaoUasg}
                onChange={(e) => setPregaoUasg(e.target.value)}
                placeholder="Ex: Pregão 08/2023 UASG 160016 (Cmdo CMA)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-600 focus:border-transparent text-sm"
              />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1">
                Situação
                <HelpTooltip>
                  Participante = sua OM está no pregão citado. Adesão/Carona =
                  está usando um pregão de outra OM. Dispensa/Inexigibilidade
                  = comprou sem licitação, por previsão legal (valor baixo,
                  fornecedor único, urgência, etc.).
                </HelpTooltip>
              </label>
              <select
                value={situacaoPregao}
                onChange={(e) => setSituacaoPregao(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-600 focus:border-transparent text-sm"
              >
                <option value="">Não informado</option>
                {SITUACOES_PREGAO.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Observação sobre o Pregão
              </label>
              <input
                type="text"
                value={observacaoPregao}
                onChange={(e) => setObservacaoPregao(e.target.value)}
                placeholder="Ex: Constar se é Participante do Pregão ou se está autorizada a adesão"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-600 focus:border-transparent text-sm"
              />
            </div>
          </div>
        </form>

        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-3 px-4 sm:px-6 py-4 border-t bg-gray-50">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSubmit} isLoading={loading}>
            {despesaToEdit ? "Salvar Alterações" : "Criar Despesa"}
          </Button>
        </div>
      </div>
    </div>
  );
}
