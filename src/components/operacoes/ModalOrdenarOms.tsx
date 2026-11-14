"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { OrdenarLista, ItemOrdenavel } from "@/components/ui/OrdenarLista";

interface ModalOrdenarOmsProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (ordemIds: string[], omsIncluidasIds: string[]) => void;
  itensIniciais: ItemOrdenavel[];
}

/**
 * Antes de gerar o PDF/XLSX "separado por OM", deixa o usuário definir em
 * que ordem cada OM aparece no documento e quais OMs entram nele.
 */
export function ModalOrdenarOms({
  isOpen,
  onClose,
  onConfirm,
  itensIniciais,
}: ModalOrdenarOmsProps) {
  const [itens, setItens] = useState<ItemOrdenavel[]>(itensIniciais);

  useEffect(() => {
    if (isOpen) setItens(itensIniciais);
  }, [isOpen, itensIniciais]);

  if (!isOpen) return null;

  const nenhumaIncluida = itens.every((item) => item.incluido === false);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          OMs na exportação
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Marque quais OMs entram no documento &quot;separado por OM&quot; e
          defina em que ordem cada uma aparece.
        </p>

        <OrdenarLista items={itens} onChange={setItens} permitirExcluir />

        {nenhumaIncluida && (
          <p className="text-sm text-red-600 mt-2">
            Selecione ao menos uma OM.
          </p>
        )}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            disabled={nenhumaIncluida}
            onClick={() =>
              onConfirm(
                itens.map((item) => item.id),
                itens
                  .filter((item) => item.incluido !== false)
                  .map((item) => item.id)
              )
            }
          >
            Gerar documento
          </Button>
        </div>
      </div>
    </div>
  );
}
