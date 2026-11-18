"use client";

import { useState, useEffect } from "react";
import {
  X,
  Building2,
  Loader2,
  Plus,
  CheckCircle2,
  Clock,
  PenLine,
} from "lucide-react";
import Link from "next/link";
import { gerarPdfPlanoTrabalho, OpcoesPdf } from "@/lib/pdf/gerarPdfPlanoTrabalho";
import { gerarPdfPlanoTrabalhoOperacional } from "@/lib/pdf/gerarPdfPlanoTrabalhoOperacional";
import {
  gerarPdfPlanoRacao,
  gerarPdfPlanoMunicao,
} from "@/lib/pdf/gerarPdfPlanoRacaoMunicao";
import type { jsPDF } from "jspdf";
import { ModalAssinarGovBr } from "@/components/planos/ModalAssinarGovBr";
import { getStatusPlanoLabel } from "@/lib/statusPlano";
import { getTipoOMLabel } from "@/lib/constants";

interface OMSubordinada {
  id: string;
  nome: string;
  sigla: string;
  tipo: string;
  isFolha: boolean;
  quantidadeSubordinadas: number;
}

interface PlanoOM {
  omId: string;
  status: string;
  id: string;
  tipo: string;
}

interface ModalOmsSubordinadasProps {
  isOpen: boolean;
  onClose: () => void;
  omParticipante: {
    id: string;
    nome: string;
    sigla: string;
  };
  operacaoId: string;
  planosTrabalho: PlanoOM[];
}

export function ModalOmsSubordinadas({
  isOpen,
  onClose,
  omParticipante,
  operacaoId,
  planosTrabalho,
}: ModalOmsSubordinadasProps) {
  const [loading, setLoading] = useState(true);
  const [subordinadas, setSubordinadas] = useState<OMSubordinada[]>([]);
  const [error, setError] = useState("");
  const [generatingPdf, setGeneratingPdf] = useState(false);

  // Estado do modal de assinatura (nome/posto/função)
  const [showAssinarModal, setShowAssinarModal] = useState(false);
  const [nomeAssinante, setNomeAssinante] = useState("");
  const [postoAssinante, setPostoAssinante] = useState("");
  const [funcaoAssinante, setFuncaoAssinante] = useState("");
  const [erroAssinatura, setErroAssinatura] = useState("");
  const [isAssinando, setIsAssinando] = useState(false);

  useEffect(() => {
    if (isOpen && omParticipante?.id) {
      loadSubordinadas();
    }
  }, [isOpen, omParticipante?.id]);

  async function loadSubordinadas() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/oms/${omParticipante.id}/subordinadas`
      );

      if (!response.ok) {
        throw new Error("Erro ao carregar subordinadas");
      }

      const data = await response.json();
      setSubordinadas(data.subordinadas || []);
    } catch (err) {
      console.error("Erro ao carregar subordinadas:", err);
      setError("Erro ao carregar OMs subordinadas");
    } finally {
      setLoading(false);
    }
  }

  function getPlano(omId: string, tipo: string = "LOGISTICO"): PlanoOM | null {
    return (
      planosTrabalho.find((p) => p.omId === omId && p.tipo === tipo) || null
    );
  }

  function getStatusColor(status: string) {
    const colors: Record<string, string> = {
      RASCUNHO: "bg-gray-100 text-gray-700",
      EM_ANALISE: "bg-amber-100 text-amber-700",
      APROVADO: "bg-green-100 text-green-700",
      REPROVADO: "bg-red-100 text-red-700",
    };
    return colors[status] || colors.RASCUNHO;
  }

  // Verifica se existem planos nas subordinadas
  const planosNasSubordinadas = planosTrabalho.filter((p) =>
    subordinadas.some((s) => s.id === p.omId)
  );
  const temPlanos = planosNasSubordinadas.length > 0;

  async function handleGerarPdf(opcoesAssinatura?: OpcoesPdf) {
    if (!temPlanos) return;

    setGeneratingPdf(true);
    try {
      const response = await fetch(
        `/api/operacoes/${operacaoId}/planos-subordinadas?omParticipanteId=${omParticipante.id}`
      );

      if (!response.ok) {
        throw new Error("Erro ao buscar planos");
      }

      const { planos, operacao } = await response.json();

      if (planos.length === 0) {
        alert("Nenhum plano encontrado nas OMs subordinadas");
        return;
      }

      const planosLogisticos = planos.filter(
        (p: { tipo: string }) => p.tipo === "LOGISTICO"
      );
      const planosOperacionais = planos.filter(
        (p: { tipo: string }) =>
          p.tipo === "OPERACIONAL_GND3" || p.tipo === "OPERACIONAL_GND4"
      );
      const planosRacao = planos.filter(
        (p: { tipo: string }) => p.tipo === "RACAO_R2"
      );
      const planosMunicao = planos.filter(
        (p: { tipo: string }) => p.tipo === "MUNICAO"
      );

      // Todos os tipos vão para o MESMO PDF (uma seção por tipo) — downloads
      // automáticos separados acabam bloqueados pelo navegador depois do
      // primeiro arquivo.
      let docCombinado: jsPDF | undefined;

      if (planosLogisticos.length > 0) {
        docCombinado = await gerarPdfPlanoTrabalho(
          planosLogisticos,
          operacao,
          undefined,
          opcoesAssinatura,
          undefined,
          docCombinado
        );
      }
      if (planosOperacionais.length > 0) {
        docCombinado = await gerarPdfPlanoTrabalhoOperacional(
          planosOperacionais,
          operacao,
          undefined,
          opcoesAssinatura,
          undefined,
          docCombinado
        );
      }
      if (planosRacao.length > 0) {
        docCombinado = await gerarPdfPlanoRacao(
          planosRacao,
          operacao,
          undefined,
          opcoesAssinatura,
          docCombinado
        );
      }
      if (planosMunicao.length > 0) {
        docCombinado = await gerarPdfPlanoMunicao(
          planosMunicao,
          operacao,
          undefined,
          opcoesAssinatura,
          docCombinado
        );
      }

      if (docCombinado) {
        docCombinado.save(
          `plano_trabalho_${operacao.nome.replace(/\s+/g, "_")}.pdf`
        );
      }
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
      alert("Erro ao gerar PDF. Tente novamente.");
    } finally {
      setGeneratingPdf(false);
    }
  }

  async function handleAssinarGovBr() {
    if (!nomeAssinante.trim()) {
      setErroAssinatura("Informe o nome da autoridade que vai assinar.");
      return;
    }
    setIsAssinando(true);
    setErroAssinatura("");
    try {
      await handleGerarPdf({
        nomeAssinante: nomeAssinante.trim(),
        postoAssinante: postoAssinante.trim() || undefined,
        funcaoAssinante: funcaoAssinante.trim() || undefined,
      });
      window.open("https://assinador.iti.br", "_blank", "noopener,noreferrer");
      setShowAssinarModal(false);
    } finally {
      setIsAssinando(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                OMs Subordinadas
              </h2>
              <p className="text-sm text-gray-500">{omParticipante.sigla}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 overflow-y-auto max-h-[60vh]">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-500">Carregando...</span>
              </div>
            ) : error ? (
              <div className="text-center py-8 text-red-500">{error}</div>
            ) : subordinadas.length === 0 ? (
              <div className="text-center py-8">
                <Building2 className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">
                  Nenhuma OM subordinada encontrada
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {subordinadas.map((om) => {
                  const plano = getPlano(om.id);
                  // Qualquer usuário autenticado pode criar plano para
                  // qualquer OM subordinada folha (sem bloqueio por OM própria).
                  const canCreatePlano = om.isFolha && !plano;

                  return (
                    <div
                      key={om.id}
                      className={`p-4 rounded-lg border ${
                        om.isFolha
                          ? "bg-green-50 border-green-200"
                          : "bg-gray-50 border-gray-200"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Building2
                            className={`w-5 h-5 ${
                              om.isFolha ? "text-green-600" : "text-gray-400"
                            }`}
                          />
                          <div>
                            <p className="font-medium text-gray-900">
                              {om.sigla}
                            </p>
                            <p className="text-sm text-gray-500">{getTipoOMLabel(om.tipo)}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {plano ? (
                            <Link
                              href={`/dashboard/planos/${plano.id}`}
                              onClick={onClose}
                            >
                              <div
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg ${getStatusColor(
                                  plano.status
                                )}`}
                              >
                                {plano.status === "APROVADO" ? (
                                  <CheckCircle2 className="w-4 h-4" />
                                ) : (
                                  <Clock className="w-4 h-4" />
                                )}
                                <span className="text-sm font-medium">
                                  {getStatusPlanoLabel(plano.status)}
                                </span>
                              </div>
                            </Link>
                          ) : canCreatePlano ? (
                            <Link
                              href={`/dashboard/planos/novo?operacaoId=${operacaoId}&omId=${om.id}&omSigla=${encodeURIComponent(om.sigla)}`}
                              onClick={onClose}
                            >
                              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-military-600 text-white hover:bg-military-700 transition-colors">
                                <Plus className="w-4 h-4" />
                                <span className="text-sm font-medium">
                                  Criar Plano
                                </span>
                              </div>
                            </Link>
                          ) : om.isFolha ? (
                            <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">
                              Sem plano
                            </span>
                          ) : (
                            <span className="text-xs text-gray-500">
                              {om.quantidadeSubordinadas} subordinada(s)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex flex-col sm:flex-row sm:justify-between gap-2 p-4 border-t bg-gray-50">
            <div>
              {temPlanos && !loading && (
                <button
                  onClick={() => {
                    setErroAssinatura("");
                    setShowAssinarModal(true);
                  }}
                  disabled={generatingPdf}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-military-600 rounded-lg hover:bg-military-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generatingPdf ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Gerando PDF...
                    </>
                  ) : (
                    <>
                      <PenLine className="w-4 h-4" />
                      Assinar no gov.br
                    </>
                  )}
                </button>
              )}
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Assinatura (nome/posto/função) */}
      <ModalAssinarGovBr
        isOpen={showAssinarModal}
        onClose={() => setShowAssinarModal(false)}
        onConfirm={handleAssinarGovBr}
        isSubmitting={isAssinando}
        erro={erroAssinatura}
        nomeAssinante={nomeAssinante}
        setNomeAssinante={setNomeAssinante}
        postoAssinante={postoAssinante}
        setPostoAssinante={setPostoAssinante}
        funcaoAssinante={funcaoAssinante}
        setFuncaoAssinante={setFuncaoAssinante}
      />
    </div>
  );
}
