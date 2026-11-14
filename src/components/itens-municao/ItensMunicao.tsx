"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Loader2, AlertCircle, Edit } from "lucide-react";
import { ModalCriarItemMunicao } from "./ModalCriarItemMunicao";
import { Button } from "@/components/ui/Button";
import type { OMSelect } from "@/types/despesas";

export interface ItemMunicao {
  id: string;
  neeNsn: string;
  tipo: string;
  quantidade: number;
  memoria: string | null;
  om: {
    id: string;
    nome: string;
    sigla: string;
    codUG: string;
  };
}

interface ItensMunicaoProps {
  planoId: string;
  oms: OMSelect[];
  loadingOms?: boolean;
  canEdit: boolean;
  onRefresh?: () => void | Promise<void>;
}

export function ItensMunicao({
  planoId,
  oms,
  loadingOms,
  canEdit,
  onRefresh,
}: ItensMunicaoProps) {
  const [loading, setLoading] = useState(true);
  const [itens, setItens] = useState<ItemMunicao[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [itemToEdit, setItemToEdit] = useState<ItemMunicao | null>(null);

  useEffect(() => {
    carregarItens();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planoId]);

  const carregarItens = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/planos/${planoId}/itens-municao`);
      if (response.ok) {
        setItens(await response.json());
      }
    } catch (error) {
      console.error("Erro ao carregar itens de munição:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSuccess = async (
    omsAdicionadas?: { id: string; sigla: string }[]
  ) => {
    await carregarItens();
    if (onRefresh) await onRefresh();
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

  const handleEdit = (item: ItemMunicao) => {
    setItemToEdit(item);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setItemToEdit(null);
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm("Tem certeza que deseja excluir este item?")) return;

    try {
      setDeletingId(itemId);
      const response = await fetch(
        `/api/planos/${planoId}/itens-municao/${itemId}`,
        { method: "DELETE" }
      );
      if (response.ok) {
        await carregarItens();
        if (onRefresh) await onRefresh();
      } else {
        const error = await response.json();
        alert(error.error || "Erro ao excluir item");
      }
    } catch (error) {
      console.error("Erro ao excluir item:", error);
      alert("Erro ao excluir item");
    } finally {
      setDeletingId(null);
    }
  };

  const gruposPorOm = oms
    .map((om) => ({
      om,
      itens: itens.filter((i) => i.om.id === om.id),
    }))
    .filter((grupo) => grupo.itens.length > 0);

  const totalGeral = itens.reduce((sum, i) => sum + i.quantidade, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
        <span className="ml-2 text-gray-600">Carregando itens...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Itens de Munição
          </h3>
          <p className="text-sm text-gray-600">
            {itens.length === 0
              ? "Nenhum item cadastrado"
              : `${itens.length} ${
                  itens.length === 1 ? "item cadastrado" : "itens cadastrados"
                }`}
          </p>
        </div>
        {canEdit && (
          <Button variant="primary" onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Item
          </Button>
        )}
      </div>

      {itens.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 mb-1">Nenhum item cadastrado</p>
          <p className="text-sm text-gray-500">
            {canEdit
              ? 'Clique em "Novo Item" para adicionar o primeiro item de munição'
              : "Este plano ainda não possui itens cadastrados"}
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-6">
            {gruposPorOm.map(({ om, itens: itensDoOm }) => {
              const subtotalOm = itensDoOm.reduce(
                (sum, i) => sum + i.quantidade,
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
                      {subtotalOm} un.
                    </span>
                  </div>

                  <div className="divide-y divide-gray-100">
                    {itensDoOm.map((item) => (
                      <div
                        key={item.id}
                        className="p-4 flex items-start justify-between gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-green-100 text-green-800">
                              {item.tipo}
                            </span>
                            <span className="text-xs text-gray-500 font-mono">
                              NEE/NSN: {item.neeNsn}
                            </span>
                            <span className="text-sm font-semibold text-gray-900">
                              {item.quantidade} un.
                            </span>
                          </div>
                          {item.memoria && (
                            <p className="text-xs text-gray-700 whitespace-pre-wrap">
                              <span className="font-medium">
                                Memória de Cálculo:
                              </span>{" "}
                              {item.memoria}
                            </p>
                          )}
                        </div>

                        {canEdit && (
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => handleEdit(item)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                              title="Editar item"
                            >
                              <Edit className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              disabled={deletingId === item.id}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Excluir item"
                            >
                              {deletingId === item.id ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                              ) : (
                                <Trash2 className="w-5 h-5" />
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-xs text-green-700 mb-1">Quantidade Total</p>
            <p className="text-2xl font-bold text-green-800">
              {totalGeral} un.
            </p>
          </div>
        </>
      )}

      {canEdit && (
        <ModalCriarItemMunicao
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          planoId={planoId}
          oms={oms}
          loadingOms={loadingOms}
          onSuccess={handleSuccess}
          itemToEdit={itemToEdit}
        />
      )}
    </div>
  );
}
