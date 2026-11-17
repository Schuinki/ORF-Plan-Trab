"use client";

import { useState, useEffect, useMemo } from "react";
import { X, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { HelpTooltip } from "@/components/ui/HelpTooltip";
import { RateioOMs } from "./RateioOMs";
import { DespesaClasseFormulario } from "./DespesaClasseFormulario";
import { getClasseNome } from "@/lib/classes";
import { Tipo } from "@prisma/client";
import type {
  ClasseSelect,
  OMSelect,
  NaturezaSelect,
  OperacaoWithEfetivo,
  RateioOM,
  RateioNatureza,
  HandleParametrosChange,
  UserOM,
} from "@/types/despesas";

// Re-export for use by other components
export type { HandleParametrosChange };

interface DespesaToEdit {
  id: string;
  classeId: string;
  tipoId: string | null;
  descricao: string;
  parametros: unknown;
  valorCalculado: number;
  valorCombustivel: number | null;
  oms: Array<{
    omDestinoId: string;
    omCompradoraId: string;
    percentual: number;
  }>;
  despesasNaturezas: Array<{
    naturezaId: string;
    percentual: number;
  }>;
  importado?: boolean;
  valorImportadoOriginal?: number | null;
}

interface ModalCriarDespesaProps {
  isOpen: boolean;
  onClose: () => void;
  planoId: string;
  oms: OMSelect[];
  loadingOms?: boolean;
  operacao: OperacaoWithEfetivo;
  onSuccess: (omsAdicionadas?: { id: string; sigla: string }[]) => void;
  despesaToEdit?: DespesaToEdit | null;
  userOm: UserOM | null;
  planoOm: UserOM | null;
}

export function ModalCriarDespesa({
  isOpen,
  onClose,
  planoId,
  oms,
  loadingOms,
  operacao,
  onSuccess,
  despesaToEdit = null,
  userOm,
  planoOm,
}: ModalCriarDespesaProps) {
  const [loading, setLoading] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingTipos, setLoadingTipos] = useState(false);
  const [loadingCriarTipo, setLoadingCriarTipo] = useState(false);
  const [loadingNaturezas, setLoadingNaturezas] = useState(false);

  const [classes, setClasses] = useState<ClasseSelect[]>([]);
  const [tipos, setTipos] = useState<Tipo[]>([]);
  const [naturezas, setNaturezas] = useState<NaturezaSelect[]>([]);

  const [classeId, setClasseId] = useState("");
  const [tipoSelecionado, setTipoSelecionado] = useState<Tipo | null>();
  const [descricao, setDescricao] = useState("");
  const [rateioOMs, setRateioOMs] = useState<RateioOM[]>([]);
  const [rateioNaturezas, setRateioNaturezas] = useState<RateioNatureza[]>([]);
  const [parametros, setParametros] = useState<unknown>(null);
  const [valorTotal, setValorTotal] = useState<number>(0);
  const [valorCombustivel, setValorCombustivel] = useState<number | undefined>(
    undefined
  );

  const [showCriarTipo, setShowCriarTipo] = useState(false);
  const [novoTipoNome, setNovoTipoNome] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});

  const classeSelecionada = classes.find((c) => c.id === classeId);

  // O carimbo ("Destinado ao X") deve refletir a OM de destino escolhida no
  // rateio, não a OM proprietária do Plano de Trabalho — caso contrário o
  // carimbo fica "invertido" em relação à coluna de OM destino no PDF quando
  // a despesa é destinada a uma OM diferente da OM do plano.
  const unidadeOmEfetiva = useMemo<UserOM | null>(() => {
    const omsDestino = rateioOMs
      .map((r) => oms.find((om) => om.id === r.omDestinoId))
      .filter((om): om is OMSelect => Boolean(om));
    if (omsDestino.length === 0) return planoOm;
    const siglas = Array.from(new Set(omsDestino.map((om) => om.sigla)));
    return {
      id: omsDestino[0].id,
      nome: omsDestino.map((om) => om.nome).join(" / "),
      sigla: siglas.join(" / "),
    };
  }, [rateioOMs, oms, planoOm]);

  useEffect(() => {
    if (isOpen) {
      carregarClasses();
      carregarNaturezas();

      if (despesaToEdit) {
        // Preencher com dados da despesa existente
        setClasseId(despesaToEdit.classeId);
        setDescricao(despesaToEdit.descricao);
        setParametros(despesaToEdit.parametros);
        setValorTotal(despesaToEdit.valorCalculado);
        setValorCombustivel(despesaToEdit.valorCombustivel || undefined);
        setRateioOMs(
          despesaToEdit.oms.map((om) => ({
            omDestinoId: om.omDestinoId,
            omCompradoraId: om.omCompradoraId,
            percentual: om.percentual,
          }))
        );
        setRateioNaturezas(
          despesaToEdit.despesasNaturezas.map((nat) => ({
            naturezaId: nat.naturezaId,
            percentual: nat.percentual,
          }))
        );
      } else {
        resetForm();
      }
    }
  }, [isOpen, despesaToEdit]);

  useEffect(() => {
    if (classeId) {
      carregarTipos(classeId);

      // Não resetar se estiver editando
      if (!despesaToEdit) {
        setTipoSelecionado(null);
        setParametros(null);
        setRateioNaturezas([]);
      }
    }
  }, [classeId]);

  // Selecionar o tipo quando estiver editando e os tipos forem carregados
  useEffect(() => {
    if (despesaToEdit && despesaToEdit.tipoId && tipos.length > 0) {
      const tipo = tipos.find((t) => t.id === despesaToEdit.tipoId);
      if (tipo) {
        setTipoSelecionado(tipo);
      }
    }
  }, [despesaToEdit, tipos]);

  const carregarClasses = async () => {
    try {
      setLoadingClasses(true);
      const response = await fetch("/api/classes");
      if (response.ok) {
        const data = await response.json();
        setClasses(data);
      }
    } catch (error) {
      console.error("Erro ao carregar classes:", error);
    } finally {
      setLoadingClasses(false);
    }
  };

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

  const carregarTipos = async (classeId: string) => {
    try {
      setLoadingTipos(true);
      const response = await fetch(`/api/classes/${classeId}/tipos`);
      if (response.ok) {
        const data = await response.json();
        setTipos(data);
      }
    } catch (error) {
      console.error("Erro ao carregar tipos:", error);
    } finally {
      setLoadingTipos(false);
    }
  };

  const handleCriarTipo = async () => {
    if (!novoTipoNome.trim() || !classeId) return;

    try {
      setLoadingCriarTipo(true);
      const response = await fetch("/api/tipos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: novoTipoNome.trim(),
          classeId,
        }),
      });

      if (response.ok) {
        await carregarTipos(classeId);
        setNovoTipoNome("");
        setShowCriarTipo(false);
      } else {
        const error = await response.json();
        alert(error.error || "Erro ao criar tipo");
      }
    } catch (error) {
      console.error("Erro ao criar tipo:", error);
      alert("Erro ao criar tipo");
    } finally {
      setLoadingCriarTipo(false);
    }
  };

  const resetForm = () => {
    setClasseId("");
    setTipoSelecionado(null);
    setDescricao("");
    setRateioOMs([]);
    setRateioNaturezas([]);
    setParametros(null);
    setValorTotal(0);
    setValorCombustivel(undefined);
    setShowCriarTipo(false);
    setNovoTipoNome("");
    setErrors({});
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!classeId) newErrors.classeId = "Selecione uma classe";
    // Só exige tipo se houver tipos disponíveis
    if (!tipoSelecionado && tipos.length > 0)
      newErrors.tipoId = "Selecione um tipo";
    if (rateioOMs.length === 0)
      newErrors.rateioOMs = "Adicione ao menos uma OM";
    else if (rateioOMs.some((om) => !om.omDestinoId || !om.omCompradoraId))
      newErrors.rateioOMs = "Selecione a OM em todas as linhas do rateio";

    const somaPercentuais = rateioOMs.reduce(
      (sum, om) => sum + Number(om.percentual),
      0
    );
    if (Math.abs(somaPercentuais - 100) > 0.01) {
      newErrors.rateioOMs = `A soma dos percentuais de OMs deve ser 100%. Soma atual: ${somaPercentuais.toFixed(
        2
      )}%`;
    }

    if (rateioNaturezas.length === 0)
      newErrors.rateioNaturezas = "Adicione ao menos uma natureza";

    const somaPercentuaisNaturezas = rateioNaturezas.reduce(
      (sum, nat) => sum + Number(nat.percentual),
      0
    );
    if (Math.abs(somaPercentuaisNaturezas - 100) > 0.01) {
      newErrors.rateioNaturezas = `A soma dos percentuais de naturezas deve ser 100%. Soma atual: ${somaPercentuaisNaturezas.toFixed(
        2
      )}%`;
    }

    if (!parametros || valorTotal === 0) {
      newErrors.parametros = "Preencha os parâmetros da despesa";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    try {
      setLoading(true);
      console.log({ valorTotal, valorCombustivel });

      const isEditing = !!despesaToEdit;
      const url = isEditing
        ? `/api/planos/${planoId}/despesas/${despesaToEdit.id}`
        : `/api/planos/${planoId}/despesas`;
      const method = isEditing ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classeId,
          tipoId: tipoSelecionado?.id ?? null,
          descricao: descricao.trim(),
          parametros,
          oms: rateioOMs,
          naturezas: rateioNaturezas,
          valorTotal,
          valorCombustivel,
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
      console.error(
        `Erro ao ${despesaToEdit ? "editar" : "criar"} despesa:`,
        error
      );
      alert(`Erro ao ${despesaToEdit ? "editar" : "criar"} despesa`);
    } finally {
      setLoading(false);
    }
  };

  const handleParametrosChange = (params: HandleParametrosChange) => {
    setParametros(params.params);
    setValorTotal(params.valor);
    setValorCombustivel(params.valorCombustivel);
    setDescricao(params.descricao || "");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 overflow-y-auto py-4 sm:py-8">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 my-0 sm:my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">
            {despesaToEdit
              ? "Editar Despesa Logística"
              : "Nova Despesa Logística"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
            disabled={loading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form
          onSubmit={handleSubmit}
          className="px-4 sm:px-6 py-4 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto"
        >
          {/* Comparação com o valor importado — fixa durante toda a reclassificação */}
          {despesaToEdit?.importado && (
            <div className="bg-amber-50 border border-amber-300 rounded-lg p-4">
              <p className="text-xs font-semibold text-amber-800 mb-2">
                Despesa fruto de importação — compare com o que o sistema
                calcula ao reclassificar
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-amber-700 mb-1">
                    Descrição original importada
                  </p>
                  <p className="text-sm text-gray-900">
                    {despesaToEdit.descricao}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-amber-700 mb-1">
                    Valor importado (original)
                  </p>
                  <p className="text-lg font-bold text-amber-800">
                    {new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    }).format(Number(despesaToEdit.valorImportadoOriginal || 0))}
                  </p>
                </div>
              </div>
              {classeSelecionada && (
                <p className="text-xs text-amber-700 mt-3">
                  O sistema calcularia:{" "}
                  <span className="font-semibold">
                    {new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    }).format(valorTotal)}
                  </span>
                  {Math.abs(
                    valorTotal - Number(despesaToEdit.valorImportadoOriginal || 0)
                  ) > 0.01
                    ? " — diferente do valor importado."
                    : " — igual ao valor importado."}
                </p>
              )}
            </div>
          )}

          {/* Classe */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-2">
              Classe de Despesa <span className="text-red-500">*</span>
              <HelpTooltip>
                As Classes (I a X) são as categorias de material usadas pelo
                Exército para organizar despesas logísticas: alimentação,
                combustível, munição, material de saúde, manutenção de
                viaturas, etc. Escolha a que mais se parece com o que você
                está comprando ou contratando.
              </HelpTooltip>
            </label>
            {loadingClasses ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
              </div>
            ) : (
              <select
                value={classeId}
                onChange={(e) => setClasseId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-600 focus:border-transparent"
              >
                <option value="">Selecione uma classe</option>
                {classes.map((classe) => (
                  <option key={classe.id} value={classe.id}>
                    {getClasseNome(classe.nome)} - {classe.descricao}
                  </option>
                ))}
              </select>
            )}
            {errors.classeId && (
              <p className="text-sm text-red-600 mt-1">{errors.classeId}</p>
            )}
          </div>

          {/* Tipo - só mostra se houver tipos disponíveis */}
          {classeId && loadingTipos && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
              </div>
            </div>
          )}

          {classeId && !loadingTipos && tipos.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo <span className="text-red-500">*</span>
              </label>
              <select
                value={tipoSelecionado?.id || ""}
                onChange={(e) =>
                  setTipoSelecionado(
                    e.target.value
                      ? tipos.find((t) => t.id === e.target.value) || null
                      : null
                  )
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-600 focus:border-transparent"
              >
                <option value="">Selecione um tipo</option>
                {tipos.map((tipo) => (
                  <option key={tipo.id} value={tipo.id} defaultValue={0}>
                    {tipo.nome}
                  </option>
                ))}
              </select>

              {showCriarTipo && (
                <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-md space-y-2">
                  <input
                    type="text"
                    value={novoTipoNome}
                    onChange={(e) => setNovoTipoNome(e.target.value)}
                    placeholder="Nome do novo tipo"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-600 focus:border-transparent text-sm"
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="primary"
                      onClick={handleCriarTipo}
                      disabled={!novoTipoNome.trim()}
                      isLoading={loadingCriarTipo}
                    >
                      Criar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setShowCriarTipo(false);
                        setNovoTipoNome("");
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
              {errors.tipoId && (
                <p className="text-sm text-red-600 mt-1">{errors.tipoId}</p>
              )}
            </div>
          )}

          {classeSelecionada && (tipoSelecionado || tipos.length === 0) && (
            <DespesaClasseFormulario
              classeId={classeId}
              classeNome={classeSelecionada.nome}
              naturezasPermitidas={classeSelecionada.naturezasPermitidas}
              tipos={tipos}
              tipoId={tipoSelecionado?.id ?? null}
              parametros={parametros}
              rateioNaturezas={rateioNaturezas}
              operacao={operacao}
              userOm={userOm}
              planoOm={unidadeOmEfetiva}
              naturezas={naturezas}
              onParametrosChange={handleParametrosChange}
              onRateioNaturezasChange={setRateioNaturezas}
              parametrosError={errors.parametros}
              rateioNaturezasError={errors.rateioNaturezas}
            />
          )}

          {/* Rateio OMs */}
          {classeSelecionada && (tipoSelecionado || tipos.length === 0) && (
            <div className="border-t pt-4">
              <RateioOMs
                oms={oms}
                loadingOms={loadingOms}
                value={rateioOMs}
                onChange={setRateioOMs}
                error={errors.rateioOMs}
              />
            </div>
          )}
        </form>

        {/* Footer */}
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
