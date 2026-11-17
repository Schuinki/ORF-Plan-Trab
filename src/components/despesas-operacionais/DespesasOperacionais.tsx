"use client";

import { Fragment, useState, useEffect } from "react";
import {
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  Edit,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { ModalCriarDespesaOperacional } from "./ModalCriarDespesaOperacional";
import { Button } from "@/components/ui/Button";
import { HelpTooltip } from "@/components/ui/HelpTooltip";
import type { OMSelect, UserOM } from "@/types/despesas";

/**
 * Serialized API response type for DespesaOperacional with relations
 */
export interface DespesaOperacional {
  id: string;
  titulo: string;
  objeto: string | null;
  objetivo: string | null;
  finalidade: string | null;
  memoriaCalculo: string;
  pregaoUasg: string | null;
  situacaoPregao: string | null;
  observacaoPregao: string | null;
  importado?: boolean;
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
  naturezas: {
    id: string;
    naturezaId: string;
    valor: number;
    natureza: {
      id: string;
      codigo: string;
      nome: string;
      gnd: string;
    };
  }[];
  createdAt: string;
}

interface DespesasOperacionaisProps {
  planoId: string;
  planoTipo: "OPERACIONAL_GND3" | "OPERACIONAL_GND4";
  oms: OMSelect[];
  loadingOms?: boolean;
  canEdit: boolean;
  onRefresh?: () => void | Promise<void>;
  userOm: UserOM | null;
  planoOm: UserOM | null;
}

export function DespesasOperacionais({
  planoId,
  planoTipo,
  oms,
  loadingOms,
  canEdit,
  onRefresh,
  userOm,
  planoOm,
}: DespesasOperacionaisProps) {
  const [loading, setLoading] = useState(true);
  const [despesas, setDespesas] = useState<DespesaOperacional[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [despesaToEdit, setDespesaToEdit] = useState<DespesaOperacional | null>(
    null
  );
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planoId]);

  const carregarDespesas = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/planos/${planoId}/despesas-operacionais`
      );
      if (response.ok) {
        const data = await response.json();
        setDespesas(data);
      }
    } catch (error) {
      console.error("Erro ao carregar despesas operacionais:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDespesaSuccess = async (
    omsAdicionadas?: { id: string; sigla: string }[]
  ) => {
    await carregarDespesas();
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

  const handleEdit = (despesa: DespesaOperacional) => {
    setDespesaToEdit(despesa);
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
        `/api/planos/${planoId}/despesas-operacionais/${despesaId}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        await carregarDespesas();
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

  const valorDespesa = (despesa: DespesaOperacional) =>
    despesa.naturezas.reduce((sum, n) => sum + Number(n.valor), 0);

  const situacaoLabel = (situacao: string | null) => {
    const labels: Record<string, string> = {
      PARTICIPANTE: "Participante do Pregão",
      ADESAO_CARONA: "Adesão / Carona",
      DISPENSA: "Dispensa de Licitação",
      INEXIGIBILIDADE: "Inexigibilidade",
      OUTRO: "Outro",
    };
    return situacao ? labels[situacao] || situacao : null;
  };

  // Agrupar despesas por OM, na ordem das OMs participantes
  const gruposPorOm = oms
    .map((om) => ({
      om,
      despesas: despesas.filter((d) => d.omDestino.id === om.id),
    }))
    .filter((grupo) => grupo.despesas.length > 0);

  // Totais gerais por GND
  const totaisPorGnd = despesas.reduce<Record<string, number>>((acc, d) => {
    d.naturezas.forEach((n) => {
      acc[n.natureza.gnd] = (acc[n.natureza.gnd] || 0) + Number(n.valor);
    });
    return acc;
  }, {});
  const totalGeral = Object.values(totaisPorGnd).reduce((a, b) => a + b, 0);

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Despesas Operacionais
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
          <Button variant="primary" onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Despesa
          </Button>
        )}
      </div>

      {despesas.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 mb-1">Nenhuma despesa cadastrada</p>
          <p className="text-sm text-gray-500">
            {canEdit
              ? 'Clique em "Nova Despesa" para adicionar a primeira despesa operacional'
              : "Este plano ainda não possui despesas cadastradas"}
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-6">
            {gruposPorOm.map(({ om, despesas: despesasDoOm }) => {
              const subtotalOm = despesasDoOm.reduce(
                (sum, d) => sum + valorDespesa(d),
                0
              );
              return (
                <div
                  key={om.id}
                  className="border border-gray-200 rounded-lg overflow-hidden"
                >
                  <div className="bg-gray-50 px-4 py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 border-b border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-800">
                      {om.sigla} - {om.nome}
                      {om.codUG && (
                        <span className="text-gray-500 font-normal">
                          {" "}
                          (UG: {om.codUG})
                        </span>
                      )}
                    </h4>
                    <span className="text-sm font-semibold text-green-700">
                      {formatCurrency(subtotalOm)}
                    </span>
                  </div>

                  <div className="overflow-x-auto">
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
                        {despesasDoOm.map((despesa) => {
                          const carimboAberto = carimboAbertoIds.has(despesa.id);
                          const detalhesAberto = detalhesAbertoIds.has(despesa.id);
                          return (
                            <Fragment key={despesa.id}>
                              <tr className="align-top">
                                <td className="p-3">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-green-100 text-green-800">
                                      {despesa.titulo}
                                    </span>
                                    {despesa.importado && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-amber-100 text-amber-800">
                                        Importado
                                      </span>
                                    )}
                                    {despesa.omCompradora.id !== despesa.omDestino.id && (
                                      <span className="text-xs text-gray-500">
                                        compra: {despesa.omCompradora.sigla}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="p-3 text-right font-semibold text-gray-900 whitespace-nowrap">
                                  {formatCurrency(valorDespesa(despesa))}
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
                                    <div className="text-xs text-gray-700 whitespace-pre-wrap font-mono bg-white border border-gray-200 rounded-md p-2 space-y-1">
                                      {despesa.objeto && (
                                        <p>
                                          <span className="font-medium">Objeto:</span>{" "}
                                          {despesa.objeto}
                                        </p>
                                      )}
                                      {despesa.objetivo && (
                                        <p>
                                          <span className="font-medium">Objetivo:</span>{" "}
                                          {despesa.objetivo}
                                        </p>
                                      )}
                                      {despesa.finalidade && (
                                        <p>
                                          <span className="font-medium">Finalidade:</span>{" "}
                                          {despesa.finalidade}
                                        </p>
                                      )}
                                      <p>
                                        <span className="font-medium">Memória de Cálculo:</span>{" "}
                                        {despesa.memoriaCalculo}
                                      </p>
                                    </div>
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
                                          {despesa.naturezas.map((n) => (
                                            <div
                                              key={n.id}
                                              className="flex items-center justify-between gap-2 text-xs"
                                            >
                                              <span className="text-gray-700 font-mono whitespace-nowrap">
                                                {n.natureza.codigo} ({n.natureza.gnd})
                                              </span>
                                              <span className="font-medium text-gray-900 whitespace-nowrap">
                                                {formatCurrency(Number(n.valor))}
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                      <div>
                                        <p className="text-xs font-medium text-gray-500 mb-1">
                                          Pregão
                                        </p>
                                        {despesa.pregaoUasg || despesa.situacaoPregao ? (
                                          <div className="text-xs text-gray-600 space-y-0.5">
                                            {despesa.pregaoUasg && <p>{despesa.pregaoUasg}</p>}
                                            {situacaoLabel(despesa.situacaoPregao) && (
                                              <p>{situacaoLabel(despesa.situacaoPregao)}</p>
                                            )}
                                            {despesa.observacaoPregao && (
                                              <p className="text-gray-500">{despesa.observacaoPregao}</p>
                                            )}
                                          </div>
                                        ) : (
                                          <p className="text-xs text-gray-400">—</p>
                                        )}
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
                </div>
              );
            })}
          </div>

          {/* Totais */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="flex items-center gap-1.5 text-sm font-semibold text-green-800 mb-3">
              Resumo Financeiro
              <HelpTooltip>
                GND 3 = despesas de custeio (dia a dia da operação). GND 4 =
                compra de equipamento/material permanente. É só uma divisão
                orçamentária — some os dois para o valor total.
              </HelpTooltip>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-green-700 mb-1">Total Geral</p>
                <p className="text-2xl font-bold text-green-800">
                  {formatCurrency(totalGeral)}
                </p>
              </div>
              {Object.entries(totaisPorGnd)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([gnd, valor]) => (
                  <div key={gnd}>
                    <p className="text-xs text-green-700 mb-1">{gnd}</p>
                    <p className="text-lg font-semibold text-green-800">
                      {formatCurrency(valor)}
                    </p>
                  </div>
                ))}
            </div>
          </div>
        </>
      )}

      {canEdit && (
        <ModalCriarDespesaOperacional
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          planoId={planoId}
          planoTipo={planoTipo}
          oms={oms}
          loadingOms={loadingOms}
          onSuccess={handleDespesaSuccess}
          despesaToEdit={despesaToEdit}
          userOm={userOm}
          planoOm={planoOm}
        />
      )}
    </div>
  );
}
