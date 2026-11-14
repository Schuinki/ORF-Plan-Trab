"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Pencil } from "lucide-react";

export interface OperacaoEditavel {
  id: string;
  nome: string;
  efetivoMil: number;
  efetivoExt?: number | null;
  dataInicio: string;
  dataFinal: string;
  finalidade?: string | null;
  motivacao?: string | null;
  consequenciaNaoAtendimento?: string | null;
  observacoes?: string | null;
  valorLimiteTotal?: number | null;
}

interface ModalEditarOperacaoProps {
  isOpen: boolean;
  onClose: () => void;
  operacao: OperacaoEditavel;
  onSuccess: () => void;
}

const toDateInputValue = (iso: string) => iso.slice(0, 10);

export function ModalEditarOperacao({
  isOpen,
  onClose,
  operacao,
  onSuccess,
}: ModalEditarOperacaoProps) {
  const [formData, setFormData] = useState({
    nome: "",
    efetivoMil: "",
    efetivoExt: "",
    dataInicio: "",
    dataFinal: "",
    finalidade: "",
    motivacao: "",
    consequenciaNaoAtendimento: "",
    observacoes: "",
    valorLimiteTotal: "",
  });
  const [erro, setErro] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        nome: operacao.nome,
        efetivoMil: String(operacao.efetivoMil),
        efetivoExt: operacao.efetivoExt ? String(operacao.efetivoExt) : "",
        dataInicio: toDateInputValue(operacao.dataInicio),
        dataFinal: toDateInputValue(operacao.dataFinal),
        finalidade: operacao.finalidade || "",
        motivacao: operacao.motivacao || "",
        consequenciaNaoAtendimento: operacao.consequenciaNaoAtendimento || "",
        observacoes: operacao.observacoes || "",
        valorLimiteTotal: operacao.valorLimiteTotal
          ? String(operacao.valorLimiteTotal)
          : "",
      });
      setErro("");
    }
  }, [isOpen, operacao]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");

    if (!formData.nome.trim()) {
      setErro("Informe o nome da operação.");
      return;
    }
    const efetivoMil = parseInt(formData.efetivoMil, 10);
    if (!formData.efetivoMil || Number.isNaN(efetivoMil) || efetivoMil <= 0) {
      setErro("Informe um efetivo (militares) válido.");
      return;
    }

    setIsSaving(true);
    try {
      const dataInicioDate = new Date(formData.dataInicio + "T12:00:00");
      const dataFinalDate = new Date(formData.dataFinal + "T12:00:00");

      const response = await fetch(`/api/operacoes/${operacao.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: formData.nome.trim(),
          efetivoMil,
          efetivoExt: formData.efetivoExt
            ? parseInt(formData.efetivoExt, 10)
            : null,
          dataInicio: dataInicioDate.toISOString(),
          dataFinal: dataFinalDate.toISOString(),
          finalidade: formData.finalidade.trim() || null,
          motivacao: formData.motivacao.trim() || null,
          consequenciaNaoAtendimento:
            formData.consequenciaNaoAtendimento.trim() || null,
          observacoes: formData.observacoes.trim() || null,
          valorLimiteTotal: formData.valorLimiteTotal
            ? parseFloat(formData.valorLimiteTotal)
            : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErro(data.error || "Erro ao salvar operação");
        return;
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error("Erro ao editar operação:", err);
      setErro("Erro ao salvar operação");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-4 sm:p-6 my-4 sm:my-8 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Editar Operação
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Input
                label="Nome da Operação"
                value={formData.nome}
                onChange={(e) =>
                  setFormData({ ...formData, nome: e.target.value })
                }
                required
              />
            </div>

            <Input
              label="Efetivo (militares)"
              type="number"
              min="1"
              value={formData.efetivoMil}
              onChange={(e) =>
                setFormData({ ...formData, efetivoMil: e.target.value })
              }
              required
            />
            <Input
              label="Efetivo (agentes externos)"
              type="number"
              min="0"
              value={formData.efetivoExt}
              onChange={(e) =>
                setFormData({ ...formData, efetivoExt: e.target.value })
              }
            />

            <Input
              label="Valor Limite Total (R$)"
              type="number"
              min="0"
              step="0.01"
              value={formData.valorLimiteTotal}
              onChange={(e) =>
                setFormData({ ...formData, valorLimiteTotal: e.target.value })
              }
            />

            <Input
              label="Data de Início"
              type="date"
              value={formData.dataInicio}
              onChange={(e) =>
                setFormData({ ...formData, dataInicio: e.target.value })
              }
              required
            />
            <Input
              label="Data Final"
              type="date"
              value={formData.dataFinal}
              onChange={(e) =>
                setFormData({ ...formData, dataFinal: e.target.value })
              }
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ações realizadas ou a realizar
            </label>
            <textarea
              value={formData.finalidade}
              onChange={(e) =>
                setFormData({ ...formData, finalidade: e.target.value })
              }
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-600 focus:border-transparent text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Despesas operacionais realizadas ou a realizar
            </label>
            <textarea
              value={formData.motivacao}
              onChange={(e) =>
                setFormData({ ...formData, motivacao: e.target.value })
              }
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-600 focus:border-transparent text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Consequência do não atendimento
            </label>
            <textarea
              value={formData.consequenciaNaoAtendimento}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  consequenciaNaoAtendimento: e.target.value,
                })
              }
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-600 focus:border-transparent text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Observações
            </label>
            <textarea
              value={formData.observacoes}
              onChange={(e) =>
                setFormData({ ...formData, observacoes: e.target.value })
              }
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-600 focus:border-transparent text-sm"
            />
          </div>

          {erro && <p className="text-sm text-red-600">{erro}</p>}

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="primary" isLoading={isSaving}>
              <Pencil className="w-4 h-4 mr-2" />
              Salvar Alterações
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
