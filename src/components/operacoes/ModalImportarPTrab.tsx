"use client";

import { useState } from "react";
import { X, Upload, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface OmParticipante {
  omId: string;
  om: { sigla: string; nome: string };
}

interface ModalImportarPTrabProps {
  isOpen: boolean;
  onClose: () => void;
  operacaoId: string;
  omsParticipantes: OmParticipante[];
  onImportado: () => void;
}

export function ModalImportarPTrab({
  isOpen,
  onClose,
  operacaoId,
  omsParticipantes,
  onImportado,
}: ModalImportarPTrabProps) {
  const [origem, setOrigem] = useState("");
  const [tipo, setTipo] = useState("LOGISTICO");
  const [omId, setOmId] = useState(omsParticipantes[0]?.omId || "");
  const [file, setFile] = useState<File | null>(null);
  const [isImportando, setIsImportando] = useState(false);
  const [erro, setErro] = useState("");
  const [resultado, setResultado] = useState<{
    linhasImportadas: number;
    planosGerados: number;
    avisos: string[];
  } | null>(null);

  if (!isOpen) return null;

  function handleClose() {
    setOrigem("");
    setTipo("LOGISTICO");
    setOmId(omsParticipantes[0]?.omId || "");
    setFile(null);
    setErro("");
    setResultado(null);
    onClose();
  }

  async function handleImportar() {
    setErro("");
    if (!origem.trim()) {
      setErro("Informe a origem do documento.");
      return;
    }
    if (!omId) {
      setErro("Selecione a OM.");
      return;
    }
    if (!file) {
      setErro("Selecione um arquivo .xlsx, .xls, .ods ou .pdf.");
      return;
    }

    setIsImportando(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("tipo", tipo);
      formData.append("omId", omId);
      formData.append("origem", origem.trim());

      const response = await fetch(
        `/api/operacoes/${operacaoId}/importar`,
        { method: "POST", body: formData }
      );
      const data = await response.json();

      if (!response.ok) {
        setErro(data.error || "Erro ao importar o arquivo.");
        return;
      }

      setResultado({
        linhasImportadas: data.linhasImportadas,
        planosGerados: data.planosGerados || 1,
        avisos: data.avisos || [],
      });
      onImportado();
    } catch (err) {
      console.error("Erro ao importar P Trab:", err);
      setErro("Erro ao importar o arquivo.");
    } finally {
      setIsImportando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={handleClose}
      />
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
            <h2 className="text-lg font-semibold text-gray-900">
              Importar P Trab
            </h2>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="p-4 space-y-4 overflow-y-auto">
            {resultado ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-700">
                  {resultado.planosGerados > 1
                    ? `${resultado.planosGerados} Planos de Trabalho criados (um por OM identificada no arquivo)`
                    : "1 Plano de Trabalho criado"}
                  : {resultado.linhasImportadas} despesa(s) reconhecida(s).
                </p>
                {resultado.avisos.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1 max-h-40 overflow-y-auto">
                    {resultado.avisos.map((aviso, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2 text-xs text-amber-800"
                      >
                        <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                        <span>{aviso}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-500">
                  Importa um P Trab inteiro (modelo padrão, em .xlsx, .xls,
                  .ods ou .pdf) direto para esta operação — não é necessário
                  criar o plano antes. Um arquivo consolidado com várias OMs
                  é automaticamente separado: cada OM identificada no
                  arquivo ganha o seu próprio Plano de Trabalho.
                </p>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Origem do documento
                  </label>
                  <input
                    type="text"
                    value={origem}
                    onChange={(e) => setOrigem(e.target.value)}
                    placeholder="Ex: E-mail da 3ª Bda Inf Mtz, 10/11/2026"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-military-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo do Plano
                  </label>
                  <select
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-military-500"
                  >
                    <option value="LOGISTICO">Logístico</option>
                    <option value="OPERACIONAL_GND3">Operacional (GND 3)</option>
                    <option value="OPERACIONAL_GND4">Operacional (GND 4)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    OM
                  </label>
                  <select
                    value={omId}
                    onChange={(e) => setOmId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-military-500"
                  >
                    {omsParticipantes.map((p) => (
                      <option key={p.omId} value={p.omId}>
                        {p.om.sigla}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">
                    OM usada quando uma linha do arquivo não citar nenhuma OM
                    participante reconhecível; linhas que citarem outra OM
                    participante geram o Plano de Trabalho dela automaticamente.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Arquivo (.xlsx, .xls, .ods ou .pdf)
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.xlsx,.xls,.ods"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="w-full text-sm text-gray-700"
                  />
                </div>

                {erro && <p className="text-sm text-red-600">{erro}</p>}
              </>
            )}
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 p-4 border-t bg-gray-50 flex-shrink-0">
            {resultado ? (
              <Button variant="primary" onClick={handleClose}>
                Fechar
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  onClick={handleImportar}
                  isLoading={isImportando}
                >
                  {!isImportando && <Upload className="w-4 h-4 mr-1" />}
                  Importar
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
