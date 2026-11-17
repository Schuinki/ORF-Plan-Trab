"use client";

import { Fragment, useState, useEffect } from "react";
import {
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  Edit,
  Zap,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ModalCriarDespesa } from "./ModalCriarDespesa";
import { ModalBlotterTabela } from "./ModalBlotterTabela";
import { getClasseNome } from "@/lib/classes";
import type { OMSelect, OperacaoWithEfetivo, UserOM } from "@/types/despesas";

/**
 * Serialized API response type for Despesa with relations
 * Note: Prisma Decimal types are serialized to numbers, Dates to strings
 */
interface Despesa {
  id: string;
  descricao: string;
  parametros: unknown;
  valorCalculado: number;
  valorCombustivel: number | null;
  importado?: boolean;
  valorImportadoOriginal?: number | null;
  classe: {
    id: string;
    nome: string;
    descricao: string;
  };
  tipo: {
    id: string;
    nome: string;
    isCombustivel: boolean;
  } | null;
  oms: {
    id: string;
    omDestinoId: string;
    omCompradoraId: string;
    percentual: number;
    omDestino: {
      id: string;
      nome: string;
      sigla: string;
      codUG: string;
    };
    omCompradora: {
      id: string;
      nome: string;
      sigla: string;
      codUG: string;
    };
  }[];
  despesasNaturezas: {
    id: string;
    naturezaId: string;
    percentual: number;
    natureza: {
      id: string;
      codigo: string;
      nome: string;
      descricao?: string;
    };
  }[];
  createdAt: string;
}

interface DespesasLogisticoProps {
  planoId: string;
  oms: OMSelect[];
  loadingOms?: boolean;
  operacao: OperacaoWithEfetivo;
  canEdit: boolean;
  onRefresh?: () => void | Promise<void>;
  userOm: UserOM | null;
  planoOm: UserOM | null;
}

export function DespesasLogistico({
  planoId,
  oms,
  loadingOms,
  operacao,
  canEdit,
  onRefresh,
  userOm,
  planoOm,
}: DespesasLogisticoProps) {
  const [loading, setLoading] = useState(true);
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showBlotter, setShowBlotter] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [despesaToEdit, setDespesaToEdit] = useState<any | null>(null);
  const [carimboAbertoIds, setCarimboAbertoIds] = useState<Set<string>>(new Set());
  const [detalhesAbertoIds, setDetalhesAbertoIds] = useState<Set<string>>(new Set());

  const toggleCarimbo = (id: string) => {
    setCarimboAbertoIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleDetalhes = (id: string) => {
    setDetalhesAbertoIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  useEffect(() => {
    carregarDespesas();
  }, [planoId]);

  const carregarDespesas = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/planos/${planoId}/despesas`);
      if (response.ok) {
        const data = await response.json();
        setDespesas(data);
      }
    } catch (error) {
      console.error("Erro ao carregar despesas:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDespesaSuccess = async (
    omsAdicionadas?: { id: string; sigla: string }[]
  ) => {
    await carregarDespesas();
    // Refresh parent data to sync total values
    if (onRefresh) {
      await onRefresh();
    }
    if (omsAdicionadas && omsAdicionadas.length > 0) {
      alert(
        `${omsAdicionadas
          .map((om) => om.sigla)
          .join(", ")} ${
          omsAdicionadas.length > 1 ? "foram adicionadas" : "foi adicionada"
        } automaticamente como participante(s) desta operação, com teto R$ 0,00. Ajuste o valor limite na página da Operação.`
      );
    }
  };

  const handleEdit = (despesa: Despesa) => {
    setDespesaToEdit({
      id: despesa.id,
      classeId: despesa.classe.id,
      tipoId: despesa.tipo?.id || null,
      descricao: despesa.descricao,
      parametros: (despesa as any).parametros,
      valorCalculado: Number(despesa.valorCalculado),
      valorCombustivel: despesa.valorCombustivel
        ? Number(despesa.valorCombustivel)
        : null,
      oms: despesa.oms.map((om) => ({
        omDestinoId: om.omDestinoId,
        omCompradoraId: om.omCompradoraId,
        percentual: Number(om.percentual),
      })),
      despesasNaturezas: despesa.despesasNaturezas.map((nat) => ({
        naturezaId: nat.naturezaId,
        percentual: Number(nat.percentual),
      })),
      importado: despesa.importado,
      valorImportadoOriginal: despesa.valorImportadoOriginal
        ? Number(despesa.valorImportadoOriginal)
        : null,
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setDespesaToEdit(null);
  };

  const handleDelete = async (despesaId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta despesa?")) return;

    try {
      setDeletingId(despesaId);
      const response = await fetch(
        `/api/planos/${planoId}/despesas/${despesaId}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        await carregarDespesas();
        // Refresh parent data to sync total values
        if (onRefresh) {
          await onRefresh();
        }
      } else {
        const error = await response.json();
        alert(error.error || "Erro ao excluir despesa");
      }
    } catch (error) {
      console.error("Erro ao excluir despesa:", error);
      alert("Erro ao excluir despesa");
    } finally {
      setDeletingId(null);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const calcularTotais = () => {
    const totalGeral = despesas.reduce(
      (sum, d) => sum + Number(d.valorCalculado),
      0
    );

    // Separar combustível por tipo (Diesel e Gasolina)
    let totalDiesel = 0;
    let totalGasolina = 0;

    despesas
      .filter((d) => d.valorCombustivel !== null)
      .forEach((d) => {
        const params = d.parametros as { tipoCombustivel?: string } | null;
        const tipoCombustivel = params?.tipoCombustivel;
        const litros = Number(d.valorCombustivel!);

        if (tipoCombustivel === "OD") {
          totalDiesel += litros;
        } else if (tipoCombustivel === "GAS") {
          totalGasolina += litros;
        }
      });

    return { totalGeral, totalDiesel, totalGasolina };
  };

  const { totalGeral, totalDiesel, totalGasolina } = calcularTotais();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
        <span className="ml-2 text-gray-600">Carregando despesas...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Despesas Logísticas
          </h3>
          <p className="text-sm text-gray-600">
            {despesas.length === 0
              ? "Nenhuma despesa cadastrada"
              : `${despesas.length} ${
                  despesas.length === 1
                    ? "despesa cadastrada"
                    : "despesas cadastradas"
                }`}
          </p>
        </div>
        {canEdit && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setShowBlotter(true)}>
              <Zap className="w-4 h-4 mr-2" />
              Entrada Rápida
            </Button>
            <Button variant="primary" onClick={() => setIsModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Despesa
            </Button>
          </div>
        )}
      </div>

      {canEdit && (
        <ModalBlotterTabela
          isOpen={showBlotter}
          onClose={() => setShowBlotter(false)}
          planoId={planoId}
          oms={oms}
          loadingOms={loadingOms}
          operacao={operacao}
          onSuccess={handleDespesaSuccess}
          userOm={userOm}
          planoOm={planoOm}
        />
      )}

      {/* Lista de Despesas */}
      {despesas.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 mb-1">Nenhuma despesa cadastrada</p>
          <p className="text-sm text-gray-500">
            {canEdit
              ? 'Clique em "Nova Despesa" para adicionar a primeira despesa logística'
              : "Este plano ainda não possui despesas cadastradas"}
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/60">
                  <th className="text-left p-3 font-medium text-gray-600">
                    Item
                  </th>
                  <th className="text-right p-3 font-medium text-gray-600">
                    Valor
                  </th>
                  <th className="p-3 text-right font-medium text-gray-600" style={{ minWidth: 130 }}>
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {despesas.map((despesa) => {
                  const carimboAberto = carimboAbertoIds.has(despesa.id);
                  const detalhesAberto = detalhesAbertoIds.has(despesa.id);
                  return (
                    <Fragment key={despesa.id}>
                      <tr className="align-top">
                        <td className="p-3">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-green-100 text-green-800">
                              {getClasseNome(despesa.classe.nome)}
                            </span>
                            {despesa.tipo && (
                              <span className="text-xs text-gray-600">
                                {despesa.tipo.nome}
                                {despesa.tipo.isCombustivel && " (Combustível)"}
                              </span>
                            )}
                            {despesa.importado && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-amber-100 text-amber-800">
                                Importado
                              </span>
                            )}
                          </div>
                          {despesa.valorCombustivel !== null && (
                            <p className="text-xs text-gray-500">
                              {Number(despesa.valorCombustivel).toLocaleString("pt-BR", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}{" "}
                              L
                            </p>
                          )}
                        </td>
                        <td className="p-3 text-right whitespace-nowrap">
                          <p className="font-semibold text-green-700">
                            {formatCurrency(Number(despesa.valorCalculado))}
                          </p>
                          {despesa.importado &&
                            despesa.valorImportadoOriginal != null && (
                              <p
                                className={`text-xs mt-0.5 ${
                                  Math.abs(
                                    Number(despesa.valorImportadoOriginal) -
                                      Number(despesa.valorCalculado)
                                  ) > 0.01
                                    ? "text-amber-700"
                                    : "text-gray-500"
                                }`}
                                title="Valor importado (original)"
                              >
                                orig.: {formatCurrency(Number(despesa.valorImportadoOriginal))}
                              </p>
                            )}
                        </td>
                        <td className="p-3 text-right whitespace-nowrap">
                          <button
                            onClick={() => toggleCarimbo(despesa.id)}
                            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-md"
                            title="Ver carimbo"
                          >
                            {carimboAberto ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => toggleDetalhes(despesa.id)}
                            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-md"
                            title="Mais informações"
                          >
                            {detalhesAberto ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                          {canEdit && (
                            <>
                              <button
                                onClick={() => handleEdit(despesa)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                title="Editar despesa"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(despesa.id)}
                                disabled={deletingId === despesa.id}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Excluir despesa"
                              >
                                {deletingId === despesa.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                      {carimboAberto && (
                        <tr className="bg-gray-50">
                          <td colSpan={3} className="p-3">
                            <label className="block text-xs font-medium text-gray-500 mb-1">
                              Carimbo
                            </label>
                            <p className="text-xs text-gray-700 whitespace-pre-wrap font-mono bg-white border border-gray-200 rounded-md p-2">
                              {despesa.descricao}
                            </p>
                          </td>
                        </tr>
                      )}
                      {detalhesAberto && (
                        <tr className="bg-gray-50">
                          <td colSpan={3} className="p-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <p className="text-xs font-medium text-gray-500 mb-1">
                                  Naturezas de Despesa
                                </p>
                                <div className="space-y-1">
                                  {despesa.despesasNaturezas.map((rateio) => (
                                    <div
                                      key={rateio.id}
                                      className="flex items-center justify-between gap-2 text-xs"
                                    >
                                      <span className="text-gray-700 font-mono">
                                        {rateio.natureza.codigo} - {rateio.natureza.nome}
                                      </span>
                                      <span className="font-medium text-gray-900 whitespace-nowrap">
                                        {formatCurrency(
                                          (Number(rateio.percentual) / 100) *
                                            Number(despesa.valorCalculado)
                                        )}{" "}
                                        ({Number(rateio.percentual).toFixed(0)}%)
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-gray-500 mb-1">
                                  Rateio por OMs
                                </p>
                                <div className="space-y-1">
                                  {despesa.oms.map((rateio) => (
                                    <div
                                      key={rateio.id}
                                      className="flex items-center justify-between gap-2 text-xs"
                                    >
                                      <span className="text-gray-700">
                                        {rateio.omDestino.sigla}
                                        {rateio.omCompradoraId !== rateio.omDestinoId && (
                                          <span className="text-gray-400">
                                            {" "}
                                            (compra: {rateio.omCompradora.sigla})
                                          </span>
                                        )}
                                      </span>
                                      <span className="font-medium text-gray-900 whitespace-nowrap">
                                        {formatCurrency(
                                          (Number(rateio.percentual) / 100) *
                                            Number(despesa.valorCalculado)
                                        )}{" "}
                                        ({Number(rateio.percentual).toFixed(0)}%)
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Totais */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-green-800 mb-3">
              Resumo Financeiro
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-green-700 mb-1">Total Geral</p>
                <p className="text-2xl font-bold text-green-800">
                  {formatCurrency(totalGeral)}
                </p>
              </div>

              {(totalDiesel > 0 || totalGasolina > 0) && (
                <div className="space-y-2">
                  <p className="text-xs text-green-700 mb-1">
                    Total de Combustível
                  </p>
                  {totalDiesel > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-green-600">Diesel:</span>
                      <span className="text-sm font-semibold text-green-800">
                        {totalDiesel.toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{" "}
                        L
                      </span>
                    </div>
                  )}
                  {totalGasolina > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-green-600">Gasolina:</span>
                      <span className="text-sm font-semibold text-green-800">
                        {totalGasolina.toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{" "}
                        L
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Modal */}
      {canEdit && (
        <ModalCriarDespesa
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          planoId={planoId}
          oms={oms}
          loadingOms={loadingOms}
          operacao={operacao}
          onSuccess={handleDespesaSuccess}
          despesaToEdit={despesaToEdit}
          userOm={userOm}
          planoOm={planoOm}
        />
      )}
    </div>
  );
}
