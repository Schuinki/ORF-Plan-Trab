"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { DropdownMenu } from "@/components/ui/DropdownMenu";
import { ArrowLeft, Trash2, Check, X, FileDown, PenLine, Upload, Loader2, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { DespesasLogistico } from "@/components/despesas/DespesasLogistico";
import { DespesasOperacionais } from "@/components/despesas-operacionais/DespesasOperacionais";
import { ItensRacaoR2 } from "@/components/itens-racao/ItensRacaoR2";
import { ItensMunicao } from "@/components/itens-municao/ItensMunicao";
import { StatusAprovacao } from "@/components/planos/StatusAprovacao";
import { HistoricoAprovacoes } from "@/components/planos/HistoricoAprovacoes";
import { ModalAssinarGovBr } from "@/components/planos/ModalAssinarGovBr";
import { UserOM } from "@/types/despesas";
import { getStatusPlanoLabel } from "@/lib/statusPlano";
import { PlanoTrabalho, Prisma } from "@prisma/client";
import { PlanoTrabalhoWithRelations } from "@/types/plano-trabalho";
import {
  gerarPdfPlanoTrabalho,
  OpcoesPdf,
} from "@/lib/pdf/gerarPdfPlanoTrabalho";
import { gerarPdfPlanoTrabalhoOperacional } from "@/lib/pdf/gerarPdfPlanoTrabalhoOperacional";

interface OM {
  id: string;
  nome: string;
  sigla: string;
  tipo: string;
  codUG: string;
}

interface NivelCadeia {
  nivel: number;
  omSigla: string;
  omNome: string;
  status: "aprovado" | "atual" | "pendente";
}

type PlanoDetalhe = PlanoTrabalhoWithRelations & {
  cadeiaAprovacao?: NivelCadeia[];
  podeAprovarNivelAtual?: boolean;
};

export default function PlanoTrabalhoPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [plano, setPlano] = useState<PlanoDetalhe | null>(null);
  const [oms, setOms] = useState<OM[]>([]);
  const [omsLoading, setOmsLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [userOm, setUserOm] = useState<UserOM | null>(null);

  // Estado para modal de exportação PDF
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfOpcoes, setPdfOpcoes] = useState<OpcoesPdf>({
    acoesRealizadas: "",
    despesasOperacionais: "",
  });
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isGeneratingXlsx, setIsGeneratingXlsx] = useState(false);

  // Estado do modal de assinatura (nome/posto da autoridade que assina)
  const [showAssinarModal, setShowAssinarModal] = useState(false);
  const [nomeAssinante, setNomeAssinante] = useState("");
  const [postoAssinante, setPostoAssinante] = useState("");
  const [funcaoAssinante, setFuncaoAssinante] = useState("");
  const [erroAssinatura, setErroAssinatura] = useState("");
  const [isAssinando, setIsAssinando] = useState(false);

  // Estado do modal de devolução (reprovar e mandar voltar)
  const [showDevolverModal, setShowDevolverModal] = useState(false);
  const [motivoDevolucao, setMotivoDevolucao] = useState("");
  const [erroDevolucao, setErroDevolucao] = useState("");
  const [isDevolvendo, setIsDevolvendo] = useState(false);

  // Estado do modal de importação de despesas (round-trip xlsx)
  const [showImportarModal, setShowImportarModal] = useState(false);
  const [arquivoImportar, setArquivoImportar] = useState<File | null>(null);
  const [isImportando, setIsImportando] = useState(false);
  const [previewImportacao, setPreviewImportacao] = useState<{
    itens: {
      linha: number;
      tipoLinha: string;
      resumo: string;
      erros: string[];
    }[];
    errosLeitura: { linha: number; mensagem: string }[];
  } | null>(null);
  const [erroImportacao, setErroImportacao] = useState("");

  useEffect(() => {
    if (id) {
      fetchData();
      fetchCurrentUser();
    }
  }, [id]);

  const fetchData = async () => {
    try {
      const [planoRes, omsRes] = await Promise.all([
        fetch(`/api/planos/${id}`),
        fetch("/api/organizacoes"),
      ]);

      if (planoRes.ok) {
        const planoData = await planoRes.json();
        setPlano(planoData);
      }

      // OMs disponíveis para o rateio = todas as OMs do sistema. Escolher
      // uma OM destino que ainda não participa da operação a adiciona
      // automaticamente (com teto R$ 0) ao salvar a despesa.
      if (omsRes.ok) {
        setOms(await omsRes.json());
        setOmsLoading(false);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch("/api/auth/me");
      if (response.ok) {
        const data = await response.json();
        if (data.om) {
          setUserOm({
            id: data.om.id,
            nome: data.om.nome,
            sigla: data.om.sigla,
          });
        }
      }
    } catch (error) {
      console.error("Error fetching current user:", error);
    }
  };

  // A permissão de aprovar no nível atual vem do backend (cadeia dinâmica por hierarquia de OM)
  const canApproveCurrentLevel = (): boolean =>
    plano?.podeAprovarNivelAtual === true;

  const nivelAtualCadeia = plano?.cadeiaAprovacao?.find(
    (n) => n.status === "atual"
  );

  const handleEnviarAnalise = async () => {
    if (
      !confirm(
        "Deseja enviar este plano para análise? Após o envio, o plano ficará bloqueado para edições até a conclusão do processo de aprovação."
      )
    )
      return;

    try {
      const response = await fetch(`/api/planos/${id}/enviar-analise`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        const data = await response.json();
        alert(data.message || "Plano enviado para análise com sucesso!");
        fetchData();
      } else {
        const error = await response.json();
        alert(error.error || "Erro ao enviar plano para análise");
      }
    } catch (error) {
      console.error("Error sending for analysis:", error);
      alert("Erro ao enviar plano para análise");
    }
  };

  const handleAprovar = async () => {
    if (!confirm("Deseja aprovar este plano de trabalho?")) return;

    try {
      const response = await fetch(`/api/planos/${id}/aprovar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao: "APROVADO" }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(data.message || "Plano aprovado com sucesso!");
        fetchData();
      } else {
        const error = await response.json();
        alert(error.error || "Erro ao aprovar plano");
      }
    } catch (error) {
      console.error("Error approving:", error);
      alert("Erro ao aprovar plano");
    }
  };

  const handleDevolver = async () => {
    if (!motivoDevolucao.trim()) {
      setErroDevolucao("Informe o motivo da devolução.");
      return;
    }

    setIsDevolvendo(true);
    setErroDevolucao("");
    try {
      const response = await fetch(`/api/planos/${id}/aprovar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao: "REPROVADO", motivo: motivoDevolucao }),
      });

      const data = await response.json();
      if (response.ok) {
        setShowDevolverModal(false);
        setMotivoDevolucao("");
        alert(
          data.message ||
            "Plano devolvido para correção. O responsável poderá editar e reenviar."
        );
        fetchData();
      } else {
        setErroDevolucao(data.error || "Erro ao devolver plano");
      }
    } catch (error) {
      console.error("Error rejecting:", error);
      setErroDevolucao("Erro ao devolver plano");
    } finally {
      setIsDevolvendo(false);
    }
  };

  const handleFecharImportarModal = () => {
    setShowImportarModal(false);
    setArquivoImportar(null);
    setPreviewImportacao(null);
    setErroImportacao("");
  };

  const handlePreVisualizarImportacao = async () => {
    if (!arquivoImportar) return;

    setIsImportando(true);
    setErroImportacao("");
    try {
      const formData = new FormData();
      formData.append("file", arquivoImportar);
      formData.append("confirmar", "false");

      const response = await fetch(`/api/planos/${id}/importar`, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (!response.ok) {
        setErroImportacao(data.error || "Erro ao ler o arquivo");
        return;
      }

      setPreviewImportacao({
        itens: data.itens,
        errosLeitura: data.errosLeitura || [],
      });
    } catch (error) {
      console.error("Erro ao pré-visualizar importação:", error);
      setErroImportacao("Erro ao ler o arquivo");
    } finally {
      setIsImportando(false);
    }
  };

  const handleConfirmarImportacao = async () => {
    if (!arquivoImportar) return;

    setIsImportando(true);
    setErroImportacao("");
    try {
      const formData = new FormData();
      formData.append("file", arquivoImportar);
      formData.append("confirmar", "true");

      const response = await fetch(`/api/planos/${id}/importar`, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (!response.ok) {
        setErroImportacao(data.error || "Erro ao importar");
        return;
      }

      alert(
        `${data.criados} despesa(s) importada(s)` +
          (data.puladas > 0 ? ` (${data.puladas} com erro, não importadas)` : "")
      );
      handleFecharImportarModal();
      fetchData();
    } catch (error) {
      console.error("Erro ao confirmar importação:", error);
      setErroImportacao("Erro ao importar");
    } finally {
      setIsImportando(false);
    }
  };

  const handleAssinarGovBr = async () => {
    if (!nomeAssinante.trim()) {
      setErroAssinatura("Informe o nome da autoridade que vai assinar.");
      return;
    }
    setIsAssinando(true);
    setErroAssinatura("");
    try {
      // Exporta o PDF com o nome/posto informados na assinatura e abre o
      // portal de assinatura do gov.br; o usuário faz o upload do arquivo
      // baixado manualmente no portal.
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
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const handleAbrirModalPdf = () => {
    // Preencher com valores da operação como padrão
    setPdfOpcoes({
      acoesRealizadas: plano?.operacao.finalidade || "",
      despesasOperacionais: plano?.operacao.motivacao || "",
    });
    setShowPdfModal(true);
  };

  const handleGerarPdf = async (opcoesExtra?: Partial<OpcoesPdf>) => {
    if (!plano) return;

    setIsGeneratingPdf(true);
    try {
      // Buscar dados completos do plano com despesas
      const response = await fetch(`/api/planos/${id}?incluirDespesas=true`);
      if (!response.ok) {
        throw new Error("Erro ao carregar dados do plano");
      }
      const planoCompleto = await response.json();
      const opcoesFinais = { ...pdfOpcoes, ...opcoesExtra };
      if (
        planoCompleto.tipo === "OPERACIONAL_GND3" ||
        planoCompleto.tipo === "OPERACIONAL_GND4"
      ) {
        await gerarPdfPlanoTrabalhoOperacional(
          planoCompleto,
          planoCompleto.operacao,
          planoCompleto.responsavel,
          opcoesFinais
        );
      } else {
        await gerarPdfPlanoTrabalho(
          planoCompleto,
          planoCompleto.operacao,
          planoCompleto.responsavel,
          opcoesFinais
        );
      }
      setShowPdfModal(false);
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      alert("Erro ao gerar PDF. Tente novamente.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleGerarXlsx = async () => {
    if (!plano) return;

    setIsGeneratingXlsx(true);
    try {
      const response = await fetch(`/api/planos/${id}?incluirDespesas=true`);
      if (!response.ok) {
        throw new Error("Erro ao carregar dados do plano");
      }
      const planoCompleto = await response.json();
      if (
        planoCompleto.tipo === "OPERACIONAL_GND3" ||
        planoCompleto.tipo === "OPERACIONAL_GND4"
      ) {
        const { gerarXlsxPlanoTrabalhoOperacional } = await import(
          "@/lib/xlsx/gerarXlsxPlanoTrabalhoOperacional"
        );
        await gerarXlsxPlanoTrabalhoOperacional(
          planoCompleto,
          planoCompleto.operacao
        );
      } else if (planoCompleto.tipo === "RACAO_R2") {
        const { gerarXlsxPlanoR2 } = await import("@/lib/xlsx/gerarXlsxPlanoR2");
        await gerarXlsxPlanoR2(planoCompleto);
      } else if (planoCompleto.tipo === "MUNICAO") {
        const { gerarXlsxPlanoMunicao } = await import(
          "@/lib/xlsx/gerarXlsxPlanoMunicao"
        );
        await gerarXlsxPlanoMunicao(planoCompleto);
      } else {
        const { gerarXlsxPlanoTrabalho } = await import(
          "@/lib/xlsx/gerarXlsxPlanoTrabalho"
        );
        await gerarXlsxPlanoTrabalho(planoCompleto, planoCompleto.operacao);
      }
    } catch (error) {
      console.error("Erro ao gerar XLSX:", error);
      alert("Erro ao gerar XLSX. Tente novamente.");
    } finally {
      setIsGeneratingXlsx(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!plano) {
    return <div>Plano não encontrado</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Link
            href={`/dashboard/operacoes/${plano.operacaoId}`}
            className="inline-flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar à Operação: {plano.operacao.nome}
          </Link>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 break-words">{plano.titulo}</h1>
              {plano.importado && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                  Importado{plano.origemImportacao ? ` — origem: ${plano.origemImportacao}` : ""}
                </span>
              )}
            </div>
            <p className="text-gray-600 mt-1">
              Operação:{" "}
              <Link
                href={`/dashboard/operacoes/${plano.operacaoId}`}
                className="hover:underline hover:text-blue-700"
              >
                {plano.operacao.nome}
              </Link>{" "}
              | Versão: {plano.versao}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <DropdownMenu
              label="Mais ações"
              icon={<MoreHorizontal className="w-4 h-4" />}
              items={[
                ...(plano.tipo !== "RACAO_R2" && plano.tipo !== "MUNICAO"
                  ? [
                      {
                        label: "Exportar PDF",
                        icon: <FileDown className="w-4 h-4" />,
                        onClick: handleGerarPdf,
                      },
                    ]
                  : []),
                {
                  label: isGeneratingXlsx ? "Gerando..." : "Exportar XLSX",
                  icon: <FileDown className="w-4 h-4" />,
                  onClick: handleGerarXlsx,
                  disabled: isGeneratingXlsx,
                },
                ...(plano.status === "RASCUNHO"
                  ? [
                      {
                        label: "Importar XLSX",
                        icon: <Upload className="w-4 h-4" />,
                        onClick: () => setShowImportarModal(true),
                      },
                    ]
                  : []),
                {
                  label: "Assinar no gov.br",
                  icon: <PenLine className="w-4 h-4" />,
                  onClick: () => {
                    setErroAssinatura("");
                    setShowAssinarModal(true);
                  },
                  separatorBefore: true,
                },
              ]}
            />
            {plano.status === "RASCUNHO" && (
              <Button variant="primary" onClick={handleEnviarAnalise}>
                <Check className="w-4 h-4 mr-2" />
                Enviar para Análise
              </Button>
            )}
            {plano.status === "EM_ANALISE" && canApproveCurrentLevel() && (
              <>
                <Button variant="success" onClick={handleAprovar}>
                  <Check className="w-4 h-4 mr-2" />
                  Aprovar
                </Button>
                <Button
                  variant="danger"
                  onClick={() => {
                    setErroDevolucao("");
                    setMotivoDevolucao("");
                    setShowDevolverModal(true);
                  }}
                >
                  <X className="w-4 h-4 mr-2" />
                  Devolver para Correção
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Alerta de Bloqueio */}
      {plano.status === "EM_ANALISE" && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-amber-600"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-amber-800">
                Plano em análise - Edições bloqueadas
              </h3>
              <div className="mt-2 text-sm text-amber-700">
                <p>
                  Este plano está em processo de aprovação.{" "}
                  {plano.nivelAprovacaoAtual && (
                    <>
                      <span className="font-semibold">
                        Aguardando aprovação do nível{" "}
                        {plano.nivelAprovacaoAtual}/
                        {plano.cadeiaAprovacao?.length ?? "?"}
                        {nivelAtualCadeia &&
                          `: S4 ${nivelAtualCadeia.omSigla}`}
                      </span>
                      {canApproveCurrentLevel() && (
                        <span className="block mt-1 text-green-700 font-semibold">
                          ✓ Você pode aprovar ou devolver este plano
                        </span>
                      )}
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">Status</div>
          <div className="text-lg font-semibold text-gray-900">
            {getStatusPlanoLabel(plano.status)}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">Responsável</div>
          <div className="text-lg font-semibold text-gray-900">
            {plano.responsavel.postoGraduacao} {plano.responsavel.nomeCompleto}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">Valor Total</div>
          <div className="text-lg font-semibold text-blue-600">
            {formatCurrency(Number(plano.valorTotalDespesas))}
          </div>
        </div>
      </div>

      {/* Despesas - Condicional por Tipo */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {plano.tipo === "LOGISTICO" ? (
          <DespesasLogistico
            planoId={id}
            oms={oms}
            loadingOms={omsLoading}
            operacao={{
              id: plano.operacao.id,
              nome: plano.operacao.nome,
              efetivo: plano.operacao.efetivoMil,
              dataInicio: String(plano.operacao.dataInicio),
              dataFinal: String(plano.operacao.dataFinal),
              diasTotais: plano.operacao.diasTotais,
            }}
            canEdit={plano.status === "RASCUNHO"}
            onRefresh={fetchData}
            userOm={userOm}
            planoOm={
              plano.om
                ? {
                    id: plano.om.id,
                    nome: plano.om.nome,
                    sigla: plano.om.sigla,
                  }
                : null
            }
          />
        ) : plano.tipo === "OPERACIONAL_GND3" || plano.tipo === "OPERACIONAL_GND4" ? (
          <DespesasOperacionais
            planoId={id}
            planoTipo={plano.tipo}
            oms={oms}
            loadingOms={omsLoading}
            canEdit={plano.status === "RASCUNHO"}
            onRefresh={fetchData}
            userOm={userOm}
            planoOm={
              plano.om
                ? {
                    id: plano.om.id,
                    nome: plano.om.nome,
                    sigla: plano.om.sigla,
                  }
                : null
            }
          />
        ) : plano.tipo === "RACAO_R2" ? (
          <ItensRacaoR2
            planoId={id}
            oms={oms}
            loadingOms={omsLoading}
            canEdit={plano.status === "RASCUNHO"}
            onRefresh={fetchData}
          />
        ) : plano.tipo === "MUNICAO" ? (
          <ItensMunicao
            planoId={id}
            oms={oms}
            loadingOms={omsLoading}
            canEdit={plano.status === "RASCUNHO"}
            onRefresh={fetchData}
          />
        ) : null}
      </div>

      {/* Status de Aprovação e Histórico */}
      {plano.status !== "RASCUNHO" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <StatusAprovacao
            nivelAtual={plano.nivelAprovacaoAtual}
            status={plano.status}
            cadeia={plano.cadeiaAprovacao}
          />
          <HistoricoAprovacoes planoId={id} />
        </div>
      )}

      {/* Modal de Assinatura (nome/posto/função da autoridade) */}
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

      {/* Modal de Devolução */}
      {showDevolverModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Devolver plano para correção
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              O plano voltará ao status de rascunho e o responsável poderá
              corrigir e reenviar para análise. Informe o motivo da devolução —
              ele ficará registrado no histórico.
            </p>
            <textarea
              value={motivoDevolucao}
              onChange={(e) => setMotivoDevolucao(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="Ex: Memória de cálculo da despesa de combustível incompleta; revisar rateio entre as OMs."
              autoFocus
            />
            {erroDevolucao && (
              <p className="text-sm text-red-600 mt-2">{erroDevolucao}</p>
            )}
            <div className="flex flex-wrap justify-end gap-2 mt-4">
              <Button
                variant="secondary"
                onClick={() => setShowDevolverModal(false)}
                disabled={isDevolvendo}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                onClick={handleDevolver}
                isLoading={isDevolvendo}
              >
                <X className="w-4 h-4 mr-2" />
                Devolver
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Importação (round-trip xlsx) */}
      {showImportarModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[calc(100vh-4rem)] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Importar despesas de um arquivo XLSX
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Use um arquivo .xlsx exportado pelo próprio sistema (deste ou de
              outro plano da mesma OM e do mesmo tipo). As despesas serão
              adicionadas às já existentes neste plano.
            </p>

            <input
              type="file"
              accept=".xlsx"
              onChange={(e) => {
                setArquivoImportar(e.target.files?.[0] || null);
                setPreviewImportacao(null);
                setErroImportacao("");
              }}
              className="block w-full text-sm text-gray-600 mb-4"
            />

            {erroImportacao && (
              <p className="text-sm text-red-600 mb-4">{erroImportacao}</p>
            )}

            {previewImportacao && (
              <div className="mb-4 border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-72 overflow-y-auto">
                {previewImportacao.errosLeitura.map((e, idx) => (
                  <div key={`leitura-${idx}`} className="p-3 bg-red-50 text-sm text-red-700">
                    Linha {e.linha}: {e.mensagem}
                  </div>
                ))}
                {previewImportacao.itens.map((item) => (
                  <div key={item.linha} className="p-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {item.resumo}
                      </p>
                      <p className="text-xs text-gray-500">Linha {item.linha}</p>
                    </div>
                    {item.erros.length === 0 ? (
                      <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded-full whitespace-nowrap">
                        Pronto para importar
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-red-700 bg-red-100 px-2 py-1 rounded-full whitespace-nowrap">
                        {item.erros.join("; ")}
                      </span>
                    )}
                  </div>
                ))}
                {previewImportacao.itens.length === 0 &&
                  previewImportacao.errosLeitura.length === 0 && (
                    <p className="p-3 text-sm text-gray-600">
                      Nenhuma despesa encontrada para este plano neste arquivo.
                    </p>
                  )}
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-2 mt-4">
              <Button
                variant="secondary"
                onClick={handleFecharImportarModal}
                disabled={isImportando}
              >
                Cancelar
              </Button>
              {!previewImportacao ? (
                <Button
                  variant="primary"
                  onClick={handlePreVisualizarImportacao}
                  disabled={!arquivoImportar || isImportando}
                >
                  {isImportando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Pré-visualizar
                </Button>
              ) : (
                <Button
                  variant="primary"
                  onClick={handleConfirmarImportacao}
                  disabled={
                    isImportando ||
                    !previewImportacao.itens.some((i) => i.erros.length === 0)
                  }
                >
                  {isImportando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  <Upload className="w-4 h-4 mr-2" />
                  Confirmar Importação
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
