"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, Upload, Trash2, Loader2, Download } from "lucide-react";

interface AnexoDTO {
  id: string;
  tipo: string;
  nomeArquivo: string;
  mimeType: string;
  tamanhoBytes: number;
  createdAt: string;
  uploadedBy: { nomeCompleto: string; nomeGuerra: string | null };
}

interface AnexoOperacaoBoxProps {
  operacaoId: string;
  tipo: "PTRAB_ASSINADO" | "DOR_ASSINADO";
  titulo: string;
  descricao: string;
}

function formatarTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AnexoOperacaoBox({ operacaoId, tipo, titulo, descricao }: AnexoOperacaoBoxProps) {
  const [anexos, setAnexos] = useState<AnexoDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [excluindo, setExcluindo] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [operacaoId, tipo]);

  async function carregar() {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/operacoes/${operacaoId}/anexos?tipo=${tipo}`
      );
      if (response.ok) {
        setAnexos(await response.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(file: File) {
    setErro(null);
    setEnviando(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("tipo", tipo);
      const response = await fetch(`/api/operacoes/${operacaoId}/anexos`, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erro ao enviar arquivo");
      setAnexos((prev) => [data, ...prev]);
    } catch (err: any) {
      setErro(err.message || "Erro ao enviar arquivo");
    } finally {
      setEnviando(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleExcluir(anexoId: string) {
    if (!confirm("Remover este documento?")) return;
    setExcluindo(anexoId);
    setErro(null);
    try {
      const response = await fetch(`/api/operacoes/${operacaoId}/anexos/${anexoId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erro ao remover documento");
      }
      setAnexos((prev) => prev.filter((a) => a.id !== anexoId));
    } catch (err: any) {
      setErro(err.message || "Erro ao remover documento");
    } finally {
      setExcluindo(null);
    }
  }

  return (
    <div className="bg-white rounded-lg border border-olive-200 p-4 sm:p-6">
      <div className="flex items-center gap-2 mb-1">
        <FileText className="w-5 h-5 text-military-600" />
        <h3 className="font-semibold text-military-900">{titulo}</h3>
      </div>
      <p className="text-sm text-olive-600 mb-3">{descricao}</p>

      {erro && <p className="text-sm text-red-600 mb-2">{erro}</p>}

      {loading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="space-y-2 mb-3">
          {anexos.length === 0 && (
            <p className="text-sm text-gray-400 italic">Nenhum documento enviado ainda.</p>
          )}
          {anexos.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between gap-2 px-3 py-2 bg-olive-50 border border-olive-100 rounded-md"
            >
              <a
                href={`/api/operacoes/${operacaoId}/anexos/${a.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-military-800 hover:underline min-w-0"
              >
                <Download className="w-4 h-4 shrink-0" />
                <span className="truncate">{a.nomeArquivo}</span>
                <span className="text-xs text-gray-500 shrink-0">
                  ({formatarTamanho(a.tamanhoBytes)})
                </span>
              </a>
              <button
                onClick={() => handleExcluir(a.id)}
                disabled={excluindo === a.id}
                className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors shrink-0"
                title="Remover"
              >
                {excluindo === a.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      <label className="flex items-center justify-center gap-2 px-3 py-2 border-2 border-dashed border-olive-300 rounded-md text-sm text-olive-700 hover:border-military-400 hover:text-military-700 hover:bg-olive-50 transition-colors cursor-pointer">
        {enviando ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Enviando...
          </>
        ) : (
          <>
            <Upload className="w-4 h-4" />
            Enviar PDF assinado
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          disabled={enviando}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file);
          }}
        />
      </label>
    </div>
  );
}
