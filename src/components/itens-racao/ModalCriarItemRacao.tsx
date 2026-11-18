"use client";

import { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { OMSelect } from "@/types/despesas";
import type { ItemRacao } from "./ItensRacaoR2";

interface ModalCriarItemRacaoProps {
  isOpen: boolean;
  onClose: () => void;
  planoId: string;
  oms: OMSelect[];
  loadingOms?: boolean;
  onSuccess: (omsAdicionadas?: { id: string; sigla: string }[]) => void;
  itemToEdit?: ItemRacao | null;
}

interface CatalogoItemRacaoDTO {
  id: string;
  item: string;
}

export function ModalCriarItemRacao({
  isOpen,
  onClose,
  planoId,
  oms,
  loadingOms,
  onSuccess,
  itemToEdit = null,
}: ModalCriarItemRacaoProps) {
  const [loading, setLoading] = useState(false);
  const [omId, setOmId] = useState("");
  const [item, setItem] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [memoria, setMemoria] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [catalogo, setCatalogo] = useState<CatalogoItemRacaoDTO[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetch("/api/configuracoes/catalogo-racao")
        .then((res) => (res.ok ? res.json() : []))
        .then(setCatalogo)
        .catch(() => setCatalogo([]));
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      if (itemToEdit) {
        setOmId(itemToEdit.om.id);
        setItem(itemToEdit.item);
        setQuantidade(String(itemToEdit.quantidade));
        setMemoria(itemToEdit.memoria || "");
      } else {
        resetForm();
      }
    }
  }, [isOpen, itemToEdit]);

  const resetForm = () => {
    setOmId("");
    setItem("");
    setQuantidade("");
    setMemoria("");
    setErrors({});
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!omId) newErrors.omId = "Selecione a OM";
    if (!item.trim()) newErrors.item = "Informe o item";
    const qtd = Number(quantidade);
    if (!quantidade || Number.isNaN(qtd) || qtd <= 0)
      newErrors.quantidade = "Informe uma quantidade maior que zero";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setLoading(true);
      const isEditing = !!itemToEdit;
      const url = isEditing
        ? `/api/planos/${planoId}/itens-racao/${itemToEdit.id}`
        : `/api/planos/${planoId}/itens-racao`;
      const method = isEditing ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          omId,
          item: item.trim(),
          quantidade: Number(quantidade),
          memoria: memoria.trim() || undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        onSuccess(data.omsAdicionadas);
        onClose();
        resetForm();
      } else {
        const error = await response.json();
        alert(error.error || `Erro ao ${isEditing ? "editar" : "criar"} item`);
      }
    } catch (error) {
      console.error("Erro ao salvar item de ração:", error);
      alert("Erro ao salvar item");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 overflow-y-auto py-4 sm:py-8">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 my-0 sm:my-8">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">
            {itemToEdit ? "Editar Item de Ração" : "Novo Item de Ração"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
            disabled={loading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-4 sm:px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              OM <span className="text-red-500">*</span>
            </label>
            {loadingOms ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
              </div>
            ) : (
              <select
                value={omId}
                onChange={(e) => setOmId(e.target.value)}
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
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Item <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              list="catalogo-itens-racao"
              value={item}
              onChange={(e) => setItem(e.target.value)}
              placeholder="Ex: Ração Operacional, Água Mineral 500ml..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-600 focus:border-transparent"
            />
            <datalist id="catalogo-itens-racao">
              {catalogo.map((c) => (
                <option key={c.id} value={c.item} />
              ))}
            </datalist>
            {catalogo.length > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                Digite para ver sugestões do catálogo cadastrado em Configurações, ou informe um
                item livre.
              </p>
            )}
            {errors.item && (
              <p className="text-sm text-red-600 mt-1">{errors.item}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quantidade <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value.replace(/\D/g, ""))}
              placeholder="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-600 focus:border-transparent"
            />
            {errors.quantidade && (
              <p className="text-sm text-red-600 mt-1">{errors.quantidade}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Memória de Cálculo
            </label>
            <textarea
              value={memoria}
              onChange={(e) => setMemoria(e.target.value)}
              rows={3}
              placeholder="Ex: Efetivo x dias de operação..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-600 focus:border-transparent text-sm"
            />
          </div>
        </form>

        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-3 px-4 sm:px-6 py-4 border-t bg-gray-50">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSubmit} isLoading={loading}>
            {itemToEdit ? "Salvar Alterações" : "Criar Item"}
          </Button>
        </div>
      </div>
    </div>
  );
}
