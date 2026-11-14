"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { OrdenarLista, ItemOrdenavel } from "@/components/ui/OrdenarLista";
import { PenLine } from "lucide-react";

interface ModalAssinarGovBrProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isSubmitting: boolean;
  erro?: string;

  nomeAssinante: string;
  setNomeAssinante: (value: string) => void;
  postoAssinante: string;
  setPostoAssinante: (value: string) => void;
  funcaoAssinante: string;
  setFuncaoAssinante: (value: string) => void;

  /** Ordem das OMs no documento — exibido só quando há mais de uma OM. */
  omsParaOrdenar?: ItemOrdenavel[];
  setOmsParaOrdenar?: (itens: ItemOrdenavel[]) => void;
}

export function ModalAssinarGovBr({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting,
  erro,
  nomeAssinante,
  setNomeAssinante,
  postoAssinante,
  setPostoAssinante,
  funcaoAssinante,
  setFuncaoAssinante,
  omsParaOrdenar,
  setOmsParaOrdenar,
}: ModalAssinarGovBrProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Assinar no gov.br
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Informe o posto/graduação, nome e função da autoridade que vai
          assinar o documento. Esses dados aparecem no bloco de assinatura do
          PDF exportado — não precisam ser o responsável pelo plano.
        </p>
        <div className="space-y-3">
          <Input
            label="Posto/Graduação"
            value={postoAssinante}
            onChange={(e) => setPostoAssinante(e.target.value)}
            placeholder="Ex: Gen Bda"
          />
          <Input
            label="Nome"
            value={nomeAssinante}
            onChange={(e) => setNomeAssinante(e.target.value)}
            placeholder="Ex: João da Silva"
            autoFocus
          />
          <Input
            label="Função"
            value={funcaoAssinante}
            onChange={(e) => setFuncaoAssinante(e.target.value)}
            placeholder="Ex: Comandante do CMA"
          />
        </div>

        {omsParaOrdenar && setOmsParaOrdenar && omsParaOrdenar.length > 1 && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ordem das OMs no documento
            </label>
            <OrdenarLista items={omsParaOrdenar} onChange={setOmsParaOrdenar} />
          </div>
        )}

        {erro && <p className="text-sm text-red-600 mt-3">{erro}</p>}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={onConfirm} isLoading={isSubmitting}>
            <PenLine className="w-4 h-4 mr-2" />
            Exportar e Assinar
          </Button>
        </div>
      </div>
    </div>
  );
}
