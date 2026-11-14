"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

interface Participante {
  id: string;
  omId: string;
  omPaiOverrideId?: string | null;
  om: { id: string; nome: string; sigla: string };
}

interface ModalHierarquiaOperacaoProps {
  isOpen: boolean;
  onClose: () => void;
  operacaoId: string;
  participantes: Participante[];
  onSalvo: () => void;
}

/**
 * Permite reorganizar, apenas no âmbito desta operação, quem fica "acima"
 * de quem entre as OMs participantes — sem alterar a hierarquia global
 * (OrganizacaoMilitar.omPaiId) usada em outras partes do sistema.
 */
export function ModalHierarquiaOperacao({
  isOpen,
  onClose,
  operacaoId,
  participantes,
  onSalvo,
}: ModalHierarquiaOperacaoProps) {
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [salvandoId, setSalvandoId] = useState<string | null>(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (isOpen) {
      setOverrides(
        Object.fromEntries(
          participantes.map((p) => [p.id, p.omPaiOverrideId || ""])
        )
      );
      setErro("");
    }
  }, [isOpen, participantes]);

  if (!isOpen) return null;

  const handleSalvarLinha = async (participanteId: string) => {
    setSalvandoId(participanteId);
    setErro("");
    try {
      const response = await fetch(
        `/api/operacoes/${operacaoId}/oms-participantes/${participanteId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            omPaiOverrideId: overrides[participanteId] || null,
          }),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        setErro(data.error || "Erro ao salvar hierarquia");
        return;
      }
      onSalvo();
    } catch {
      setErro("Erro ao salvar hierarquia");
    } finally {
      setSalvandoId(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Hierarquia das OMs nesta operação
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Defina, apenas para esta operação, qual OM fica &quot;acima&quot; de
          qual — sem alterar a hierarquia cadastral de cada OM. Deixe em
          branco para manter no nível padrão.
        </p>

        <div className="space-y-3">
          {participantes.map((p) => (
            <div key={p.id} className="flex items-center gap-2">
              <span className="flex-1 text-sm font-medium text-gray-900 truncate">
                {p.om.sigla} - {p.om.nome}
              </span>
              <select
                value={overrides[p.id] || ""}
                onChange={(e) =>
                  setOverrides((prev) => ({ ...prev, [p.id]: e.target.value }))
                }
                className="flex-1 px-2 py-1.5 border border-gray-300 rounded-md text-sm bg-white"
              >
                <option value="">(nível padrão)</option>
                {participantes
                  .filter((other) => other.omId !== p.omId)
                  .map((other) => (
                    <option key={other.omId} value={other.omId}>
                      {other.om.sigla}
                    </option>
                  ))}
              </select>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleSalvarLinha(p.id)}
                isLoading={salvandoId === p.id}
              >
                Salvar
              </Button>
            </div>
          ))}
        </div>

        {erro && <p className="text-sm text-red-600 mt-3">{erro}</p>}

        <div className="flex justify-end mt-4">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
}
