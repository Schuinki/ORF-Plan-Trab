"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { DropdownMenu } from "@/components/ui/DropdownMenu";
import {
  ArrowLeft,
  Plus,
  Calendar,
  Users,
  FileText,
  AlertCircle,
  Trash2,
  Building2,
  DollarSign,
  CheckCircle2,
  Clock,
  ChevronRight,
  MoreHorizontal,
  Upload,
  PenLine,
  Pencil,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { ModalOmsSubordinadas } from "@/components/operacoes/ModalOmsSubordinadas";
import { ModalImportarPTrab } from "@/components/operacoes/ModalImportarPTrab";
import { ModalAssinarGovBr } from "@/components/planos/ModalAssinarGovBr";
import { ModalEditarOperacao } from "@/components/operacoes/ModalEditarOperacao";
import { ModalOrdenarOms } from "@/components/operacoes/ModalOrdenarOms";
import { ModalHierarquiaOperacao } from "@/components/operacoes/ModalHierarquiaOperacao";
import { SeletorOmBusca } from "@/components/operacoes/SeletorOmBusca";
import { useSession } from "@/hooks/useSession";
import { getStatusPlanoLabel } from "@/lib/statusPlano";
import { ItemOrdenavel } from "@/components/ui/OrdenarLista";
import { gerarPdfPlanoTrabalho, OpcoesPdf } from "@/lib/pdf/gerarPdfPlanoTrabalho";
import { gerarPdfPlanoTrabalhoOperacional } from "@/lib/pdf/gerarPdfPlanoTrabalhoOperacional";

const TIPOS_PLANO: { value: string; label: string }[] = [
  { value: "LOGISTICO", label: "Logístico" },
  { value: "OPERACIONAL_GND3", label: "Operacional (GND 3)" },
  { value: "OPERACIONAL_GND4", label: "Operacional (GND 4)" },
];

interface OMParticipante {
  id: string;
  omId: string;
  valorLimite: number;
  omPaiOverrideId?: string | null;
  om: {
    id: string;
    nome: string;
    sigla: string;
    tipo: string;
    codUG: string | null;
  };
}

interface PlanoTrabalho {
  id: string;
  titulo: string;
  versao: number;
  status: string;
  tipo: string;
  omId: string;
  valorTotalDespesas?: number;
  importado?: boolean;
  origemImportacao?: string;
  responsavel: {
    nomeCompleto: string;
    nomeGuerra?: string;
    postoGraduacao: string;
  };
  om?: {
    id: string;
    nome: string;
    sigla: string;
  };
}

interface Operacao {
  id: string;
  nome: string;
  efetivoMil: number;
  efetivoExt?: number;
  dataInicio: string;
  dataFinal: string;
  status: string;
  valorLimiteTotal?: number;
  finalidade?: string;
  motivacao?: string;
  consequenciaNaoAtendimento?: string;
  observacoes?: string;
  orgaoRequisitante?: string | null;
  responsavelDemanda?: string | null;
  emailResponsavel?: string | null;
  telefoneResponsavel?: string | null;
  dorNumero?: string | null;
  dorData?: string | null;
  om: {
    id: string;
    nome: string;
    sigla: string;
    tipo: string;
  };
  omsParticipantes: OMParticipante[];
  planosTrabalho: PlanoTrabalho[];
}

export default function OperacaoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { user } = useSession();

  const [operacao, setOperacao] = useState<Operacao | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedOmForModal, setSelectedOmForModal] = useState<{
    id: string;
    nome: string;
    sigla: string;
  } | null>(null);
  const [subordinadasCount, setSubordinadasCount] = useState<
    Record<string, number>
  >({});
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [generatingXlsx, setGeneratingXlsx] = useState(false);
  const [tipoPlanoAtivo, setTipoPlanoAtivo] = useState<string>("LOGISTICO");
  const [showImportarModal, setShowImportarModal] = useState(false);

  // Estado do modal de assinatura (nome/posto/função + consolidado-separado)
  const [showAssinarModal, setShowAssinarModal] = useState(false);
  const [nomeAssinante, setNomeAssinante] = useState("");
  const [postoAssinante, setPostoAssinante] = useState("");
  const [funcaoAssinante, setFuncaoAssinante] = useState("");
  const [erroAssinatura, setErroAssinatura] = useState("");
  const [isAssinando, setIsAssinando] = useState(false);
  const [omsParaOrdenarAssinatura, setOmsParaOrdenarAssinatura] = useState<
    ItemOrdenavel[]
  >([]);

  // Estado do modal de ordenação de OMs (exportação "separado por OM")
  const [showOrdenarModal, setShowOrdenarModal] = useState(false);
  const [acaoExportPendente, setAcaoExportPendente] = useState<
    "pdf" | "xlsx" | null
  >(null);
  const [omsParaOrdenarExport, setOmsParaOrdenarExport] = useState<
    ItemOrdenavel[]
  >([]);

  // Estado do modal de adicionar OM participante
  const [showEditarModal, setShowEditarModal] = useState(false);
  const [showAddOmModal, setShowAddOmModal] = useState(false);
  const [showHierarquiaModal, setShowHierarquiaModal] = useState(false);
  const [todasOms, setTodasOms] = useState<
    { id: string; nome: string; sigla: string; tipo?: string }[]
  >([]);
  const [loadingTodasOms, setLoadingTodasOms] = useState(false);
  const [novoOmId, setNovoOmId] = useState("");
  const [novoValorLimite, setNovoValorLimite] = useState("");

  // Estado do formulário de cadastro rápido de nova OM (apenas SUPER_ADMIN)
  const [showNovaOmForm, setShowNovaOmForm] = useState(false);
  const [novaOmNome, setNovaOmNome] = useState("");
  const [novaOmSigla, setNovaOmSigla] = useState("");
  const [novaOmTipo, setNovaOmTipo] = useState("BATALHAO");
  const [novaOmCodUG, setNovaOmCodUG] = useState("");
  const [erroNovaOm, setErroNovaOm] = useState("");
  const [isCriandoOm, setIsCriandoOm] = useState(false);
  const [erroAddOm, setErroAddOm] = useState("");
  const [isAddingOm, setIsAddingOm] = useState(false);

  // Estado do modal de geração da DOR
  const [showDorModal, setShowDorModal] = useState(false);
  const [dorOrgao, setDorOrgao] = useState("");
  const [dorResponsavel, setDorResponsavel] = useState("");
  const [dorEmail, setDorEmail] = useState("");
  const [dorTelefone, setDorTelefone] = useState("");
  const [dorNumero, setDorNumero] = useState("");
  const [erroDor, setErroDor] = useState("");
  const [isGerandoDor, setIsGerandoDor] = useState(false);

  useEffect(() => {
    if (id) {
      fetchOperacao();
    }
  }, [id]);

  // Buscar contagem de subordinadas para cada OM participante
  useEffect(() => {
    if (operacao?.omsParticipantes) {
      operacao.omsParticipantes.forEach(async (omPart) => {
        try {
          const response = await fetch(`/api/oms/${omPart.om.id}/subordinadas`);
          if (response.ok) {
            const data = await response.json();
            setSubordinadasCount((prev) => ({
              ...prev,
              [omPart.om.id]: data.subordinadas?.length || 0,
            }));
          }
        } catch (error) {
          console.error("Erro ao buscar subordinadas:", error);
        }
      });
    }
  }, [operacao?.omsParticipantes]);

  // Ordem das OMs escolhida pelo usuário para a exportação "separado por
  // OM" é lembrada por operação (localStorage), para não precisar reordenar
  // a cada exportação.
  const ordemOmsStorageKey = (operacaoId: string) =>
    `sisptrab:ordemOms:${operacaoId}`;

  const carregarOrdemSalva = (operacaoId: string): string[] => {
    try {
      const raw = window.localStorage.getItem(ordemOmsStorageKey(operacaoId));
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };

  const salvarOrdem = (operacaoId: string, ids: string[]) => {
    try {
      window.localStorage.setItem(
        ordemOmsStorageKey(operacaoId),
        JSON.stringify(ids)
      );
    } catch {
      // localStorage indisponível (ex.: modo privado) — segue sem lembrar
    }
  };

  // Lista única de OMs com plano de trabalho na operação, respeitando a
  // última ordem escolhida pelo usuário (OMs novas entram no final).
  const getOmsParaOrdenar = (): ItemOrdenavel[] => {
    if (!operacao) return [];
    const mapa = new Map<string, ItemOrdenavel>();
    operacao.planosTrabalho.forEach((plano) => {
      if (plano.om) {
        mapa.set(plano.om.id, {
          id: plano.om.id,
          label: `${plano.om.sigla} - ${plano.om.nome}`,
        });
      }
    });

    const ordemSalva = carregarOrdemSalva(operacao.id);
    if (ordemSalva.length === 0) return Array.from(mapa.values());

    const ordenadas: ItemOrdenavel[] = [];
    ordemSalva.forEach((omId) => {
      const om = mapa.get(omId);
      if (om) {
        ordenadas.push(om);
        mapa.delete(omId);
      }
    });
    mapa.forEach((om) => ordenadas.push(om));
    return ordenadas;
  };

  const abrirOrdenarOms = (acao: "pdf" | "xlsx") => {
    const oms = getOmsParaOrdenar();
    if (oms.length <= 1) {
      if (acao === "pdf") handleGerarPdf();
      else handleGerarXlsx();
      return;
    }
    setAcaoExportPendente(acao);
    setOmsParaOrdenarExport(oms);
    setShowOrdenarModal(true);
  };

  const confirmarOrdemExport = (
    ordemIds: string[],
    omsIncluidasIds: string[]
  ) => {
    if (operacao) salvarOrdem(operacao.id, ordemIds);
    setShowOrdenarModal(false);
    if (acaoExportPendente === "pdf") {
      handleGerarPdf(undefined, ordemIds, omsIncluidasIds);
    } else if (acaoExportPendente === "xlsx") {
      handleGerarXlsx(ordemIds, omsIncluidasIds);
    }
    setAcaoExportPendente(null);
  };

  const fetchOperacao = async () => {
    try {
      const response = await fetch(`/api/operacoes/${id}`);
      if (response.ok) {
        const data = await response.json();
        setOperacao(data);
      }
    } catch (error) {
      console.error("Error fetching operacao:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAbrirAddOmModal = async () => {
    setErroAddOm("");
    setNovoOmId("");
    setNovoValorLimite("");
    setShowAddOmModal(true);
    setLoadingTodasOms(true);
    try {
      const response = await fetch("/api/organizacoes");
      if (response.ok) {
        const data = await response.json();
        setTodasOms(data);
      }
    } catch (err) {
      console.error("Erro ao carregar OMs:", err);
    } finally {
      setLoadingTodasOms(false);
    }
  };

  const handleAddOm = async () => {
    if (!novoOmId) {
      setErroAddOm("Selecione uma OM.");
      return;
    }
    const valorLimite = parseFloat(novoValorLimite);
    if (!novoValorLimite || Number.isNaN(valorLimite) || valorLimite <= 0) {
      setErroAddOm("Informe um valor limite válido.");
      return;
    }

    setIsAddingOm(true);
    setErroAddOm("");
    try {
      const response = await fetch(`/api/operacoes/${id}/oms-participantes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ omId: novoOmId, valorLimite }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErroAddOm(data.error || "Erro ao adicionar OM");
        return;
      }

      await fetchOperacao();
      setShowAddOmModal(false);
    } catch (err) {
      console.error("Erro ao adicionar OM:", err);
      setErroAddOm("Erro ao adicionar OM");
    } finally {
      setIsAddingOm(false);
    }
  };

  const handleCriarOm = async () => {
    if (!novaOmNome.trim() || !novaOmSigla.trim()) {
      setErroNovaOm("Informe nome e sigla da OM.");
      return;
    }

    setIsCriandoOm(true);
    setErroNovaOm("");
    try {
      const response = await fetch("/api/organizacoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: novaOmNome.trim(),
          sigla: novaOmSigla.trim(),
          tipo: novaOmTipo,
          codUG: novaOmCodUG.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErroNovaOm(data.error || "Erro ao cadastrar OM");
        return;
      }

      setTodasOms((prev) => [...prev, data]);
      setNovoOmId(data.id);
      setShowNovaOmForm(false);
      setNovaOmNome("");
      setNovaOmSigla("");
      setNovaOmTipo("BATALHAO");
      setNovaOmCodUG("");
    } catch (err) {
      console.error("Erro ao cadastrar OM:", err);
      setErroNovaOm("Erro ao cadastrar OM");
    } finally {
      setIsCriandoOm(false);
    }
  };

  const omsDisponiveisParaAdicionar = todasOms.filter(
    (om) => !operacao?.omsParticipantes.some((p) => p.om.id === om.id)
  );

  const getStatusColor = (status: string) => {
    const colors = {
      RASCUNHO: "bg-olive-100 text-olive-800",
      EM_ANALISE: "bg-amber-100 text-amber-800",
      APROVADO: "bg-military-200 text-military-900",
      REPROVADO: "bg-red-100 text-red-800",
    };
    return (
      colors[status as keyof typeof colors] || "bg-olive-100 text-olive-800"
    );
  };

  const handleDelete = async () => {
    if (
      !confirm(
        "Tem certeza que deseja excluir esta operação? Esta ação não pode ser desfeita."
      )
    ) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/operacoes/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        router.push("/dashboard/operacoes");
      } else {
        const error = await response.json();
        alert(`Erro ao excluir operação: ${error.error}`);
      }
    } catch (error) {
      console.error("Error deleting operacao:", error);
      alert("Erro ao excluir operação");
    } finally {
      setIsDeleting(false);
    }
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  // Converte uma lista de omIds selecionados no ModalOrdenarOms para
  // CODUGs (chave usada pelo motor de consolidado, que trabalha sobre
  // despesas já processadas — essas só carregam CODUG/nome, não omId).
  const omIdsParaCodUGs = (omIds?: string[]): string[] | undefined => {
    if (!omIds || !operacao) return undefined;
    const codUGPorOmId = new Map(
      operacao.omsParticipantes.map((p) => [p.omId, p.om.codUG])
    );
    return omIds
      .map((omId) => codUGPorOmId.get(omId))
      .filter((codUG): codUG is string => !!codUG);
  };

  const handleGerarPdf = async (
    opcoesAssinatura?: OpcoesPdf,
    ordemOmIds?: string[],
    omsIncluidasIds?: string[]
  ) => {
    if (!operacao || operacao.planosTrabalho.length === 0) {
      alert("Não há planos de trabalho para gerar o PDF");
      return;
    }

    setGeneratingPdf(true);
    try {
      const response = await fetch(`/api/operacoes/${id}/planos`);

      if (!response.ok) {
        throw new Error("Erro ao buscar planos");
      }

      const { planos, operacao: operacaoCompleta } = await response.json();

      if (planos.length === 0) {
        alert("Nenhum plano de trabalho encontrado");
        return;
      }

      // Cada tipo de plano tem um layout de PDF próprio; planos mistos geram
      // um arquivo por tipo.
      const planosLogisticos = planos.filter(
        (p: { tipo: string }) => p.tipo === "LOGISTICO"
      );
      const planosOperacionais = planos.filter(
        (p: { tipo: string }) =>
          p.tipo === "OPERACIONAL_GND3" || p.tipo === "OPERACIONAL_GND4"
      );

      // A ordem em que cada OM aparece no PDF segue a ordem escolhida pelo
      // usuário (ver ModalOrdenarOms).
      const ordenarPorOm = (lista: any[]) =>
        !ordemOmIds || ordemOmIds.length === 0
          ? lista
          : [...lista].sort(
              (a, b) =>
                ordemOmIds.indexOf(a.omId) - ordemOmIds.indexOf(b.omId)
            );

      const planosLogisticosOrdenados = ordenarPorOm(planosLogisticos);
      const planosOperacionaisOrdenados = ordenarPorOm(planosOperacionais);

      const omsIncluidasCodUGs = omIdsParaCodUGs(omsIncluidasIds);

      if (planosLogisticosOrdenados.length > 0) {
        await gerarPdfPlanoTrabalho(
          planosLogisticosOrdenados,
          operacaoCompleta,
          undefined,
          opcoesAssinatura,
          omsIncluidasCodUGs
        );
      }
      if (planosOperacionaisOrdenados.length > 0) {
        await gerarPdfPlanoTrabalhoOperacional(
          planosOperacionaisOrdenados,
          operacaoCompleta,
          undefined,
          opcoesAssinatura,
          omsIncluidasCodUGs
        );
      }
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
      alert("Erro ao gerar PDF. Tente novamente.");
    } finally {
      setGeneratingPdf(false);
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
      const ordemIds = omsParaOrdenarAssinatura.map((om) => om.id);
      if (ordemIds.length > 0 && operacao) salvarOrdem(operacao.id, ordemIds);
      await handleGerarPdf(
        {
          nomeAssinante: nomeAssinante.trim(),
          postoAssinante: postoAssinante.trim() || undefined,
          funcaoAssinante: funcaoAssinante.trim() || undefined,
        },
        ordemIds
      );
      window.open("https://assinador.iti.br", "_blank", "noopener,noreferrer");
      setShowAssinarModal(false);
    } finally {
      setIsAssinando(false);
    }
  };

  const handleGerarXlsx = async (
    ordemOmIds?: string[],
    omsIncluidasIds?: string[]
  ) => {
    if (!operacao || operacao.planosTrabalho.length === 0) {
      alert("Não há planos de trabalho para gerar o XLSX");
      return;
    }

    setGeneratingXlsx(true);
    try {
      const response = await fetch(`/api/operacoes/${id}/planos`);

      if (!response.ok) {
        throw new Error("Erro ao buscar planos");
      }

      const { planos, operacao: operacaoCompleta } = await response.json();

      if (planos.length === 0) {
        alert("Nenhum plano de trabalho encontrado");
        return;
      }

      // A ordem das abas/blocos por OM segue a ordem escolhida pelo usuário
      // (ver ModalOrdenarOms).
      const planosOrdenados =
        ordemOmIds && ordemOmIds.length > 0
          ? [...planos].sort(
              (a: { omId: string }, b: { omId: string }) =>
                ordemOmIds.indexOf(a.omId) - ordemOmIds.indexOf(b.omId)
            )
          : planos;

      const { gerarXlsxConsolidado } = await import(
        "@/lib/xlsx/gerarXlsxConsolidado"
      );
      await gerarXlsxConsolidado(
        planosOrdenados,
        operacaoCompleta,
        omIdsParaCodUGs(omsIncluidasIds)
      );
    } catch (err) {
      console.error("Erro ao gerar XLSX:", err);
      alert("Erro ao gerar XLSX. Tente novamente.");
    } finally {
      setGeneratingXlsx(false);
    }
  };

  const handleAbrirDorModal = () => {
    if (!operacao) return;
    setDorOrgao(operacao.orgaoRequisitante || "");
    setDorResponsavel(operacao.responsavelDemanda || "");
    setDorEmail(operacao.emailResponsavel || "");
    setDorTelefone(operacao.telefoneResponsavel || "");
    setDorNumero(operacao.dorNumero || "");
    setErroDor("");
    setShowDorModal(true);
  };

  const handleGerarDor = async () => {
    if (!operacao) return;
    if (!dorOrgao.trim() || !dorResponsavel.trim()) {
      setErroDor("Informe ao menos o órgão e o responsável pela demanda.");
      return;
    }

    setIsGerandoDor(true);
    setErroDor("");
    try {
      // Salva os dados da DOR na operação para reaproveitar da próxima vez.
      const patchResponse = await fetch(`/api/operacoes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgaoRequisitante: dorOrgao.trim(),
          responsavelDemanda: dorResponsavel.trim(),
          emailResponsavel: dorEmail.trim() || null,
          telefoneResponsavel: dorTelefone.trim() || null,
          dorNumero: dorNumero.trim() || null,
        }),
      });
      if (!patchResponse.ok) {
        const data = await patchResponse.json();
        setErroDor(data.error || "Erro ao salvar dados da DOR");
        return;
      }

      const planosResponse = await fetch(`/api/operacoes/${id}/planos`);
      if (!planosResponse.ok) throw new Error("Erro ao buscar planos");
      const { planos, operacao: operacaoCompleta } = await planosResponse.json();

      if (planos.length === 0) {
        setErroDor("Nenhum plano de trabalho encontrado para gerar a DOR.");
        return;
      }

      const { gerarXlsxDor } = await import("@/lib/xlsx/gerarXlsxDor");
      await gerarXlsxDor(planos, operacaoCompleta, undefined, {
        nomeAssinante: dorResponsavel.trim(),
      });

      setShowDorModal(false);
      await fetchOperacao();
    } catch (err) {
      console.error("Erro ao gerar DOR:", err);
      setErroDor(
        err instanceof Error ? err.message : "Erro ao gerar DOR. Tente novamente."
      );
    } finally {
      setIsGerandoDor(false);
    }
  };

  // Calcular valor total utilizado (soma dos planos)
  const valorTotalUtilizado =
    operacao?.planosTrabalho.reduce(
      (acc, plano) => acc + (Number(plano.valorTotalDespesas) || 0),
      0
    ) || 0;

  // Obter todos os planos de um tipo específico de uma OM (pode ter mais de um)
  const getPlanosByOm = (omId: string, tipo: string = "LOGISTICO") => {
    return (
      operacao?.planosTrabalho.filter(
        (p) => p.omId === omId && p.tipo === tipo
      ) || []
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-military-600"></div>
      </div>
    );
  }

  if (!operacao) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-military-900 mb-2">
          Operação não encontrada
        </h2>
        <p className="text-olive-700 mb-6">
          A operação que você procura não existe ou foi removida
        </p>
        <Link href="/dashboard/operacoes">
          <Button variant="secondary">Voltar para Operações</Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/dashboard/operacoes"
          className="inline-flex items-center text-olive-700 hover:text-military-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para Operações
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-military-900 mb-2 break-words">
              {operacao.nome}
            </h1>
            <p className="text-olive-700">
              Criada por: {operacao.om.sigla} - {operacao.om.nome}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <DropdownMenu
              label={
                generatingPdf || generatingXlsx || isDeleting
                  ? "Processando..."
                  : "Ações"
              }
              icon={<MoreHorizontal className="w-4 h-4" />}
              items={[
                ...(operacao.planosTrabalho.length > 0
                  ? [
                      {
                        label: "Gerar PDF",
                        icon: <FileText className="w-4 h-4" />,
                        onClick: () => abrirOrdenarOms("pdf"),
                        disabled: generatingPdf,
                      },
                      {
                        label: "Gerar XLSX",
                        icon: <FileText className="w-4 h-4" />,
                        onClick: () => abrirOrdenarOms("xlsx"),
                        disabled: generatingXlsx,
                        separatorBefore: true,
                      },
                      {
                        label: "Gerar DOR",
                        icon: <FileText className="w-4 h-4" />,
                        onClick: handleAbrirDorModal,
                        disabled: isGerandoDor,
                        separatorBefore: true,
                      },
                      {
                        label: "Assinar no gov.br",
                        icon: <PenLine className="w-4 h-4" />,
                        onClick: () => {
                          setErroAssinatura("");
                          setOmsParaOrdenarAssinatura(getOmsParaOrdenar());
                          setShowAssinarModal(true);
                        },
                        disabled: generatingPdf,
                      },
                    ]
                  : []),
                {
                  label: "Editar Operação",
                  icon: <Pencil className="w-4 h-4" />,
                  onClick: () => setShowEditarModal(true),
                  separatorBefore: true,
                },
                {
                  label: isDeleting ? "Excluindo..." : "Excluir operação",
                  icon: <Trash2 className="w-4 h-4" />,
                  onClick: handleDelete,
                  disabled: isDeleting,
                  danger: true,
                },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Resumo da Operação */}
      <div className="bg-white rounded-lg border border-olive-200 mb-6 overflow-x-auto">
        <table className="w-full text-sm">
          <tbody>
            <tr className="border-b border-olive-100">
              <td className="p-3 font-medium text-olive-700 w-48">
                <Users className="w-4 h-4 inline mr-2 text-military-600" />
                Efetivo
              </td>
              <td className="p-3 text-military-900">
                {operacao.efetivoMil} militares
                {operacao.efetivoExt
                  ? ` + ${operacao.efetivoExt} agentes externos`
                  : ""}
              </td>
            </tr>
            <tr className="border-b border-olive-100">
              <td className="p-3 font-medium text-olive-700">
                <Calendar className="w-4 h-4 inline mr-2 text-military-600" />
                Período
              </td>
              <td className="p-3 text-military-900">
                {format(new Date(operacao.dataInicio), "dd/MM/yyyy")} até{" "}
                {format(new Date(operacao.dataFinal), "dd/MM/yyyy")} (
                {Math.ceil(
                  (new Date(operacao.dataFinal).getTime() -
                    new Date(operacao.dataInicio).getTime()) /
                    (1000 * 60 * 60 * 24)
                )}{" "}
                dias)
              </td>
            </tr>
            <tr className="border-b border-olive-100">
              <td className="p-3 font-medium text-olive-700">
                <DollarSign className="w-4 h-4 inline mr-2 text-military-600" />
                Valor Limite Total
              </td>
              <td className="p-3 text-military-900">
                {operacao.valorLimiteTotal
                  ? formatCurrency(Number(operacao.valorLimiteTotal))
                  : "Não definido"}
                {operacao.valorLimiteTotal && (
                  <span className="text-olive-600">
                    {" "}
                    — Utilizado: {formatCurrency(valorTotalUtilizado)} (
                    {(
                      (valorTotalUtilizado /
                        Number(operacao.valorLimiteTotal)) *
                      100
                    ).toFixed(1)}
                    %)
                  </span>
                )}
              </td>
            </tr>
            <tr>
              <td className="p-3 font-medium text-olive-700">
                <Building2 className="w-4 h-4 inline mr-2 text-military-600" />
                OMs Participantes / Planos
              </td>
              <td className="p-3 text-military-900">
                {operacao.omsParticipantes.length} OM(s) · {operacao.planosTrabalho.length} plano(s)
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* OMs Participantes */}
      <div className="bg-white rounded-lg border border-olive-200 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-6 pb-0">
          <h2 className="text-xl font-semibold text-military-900">
            OMs Participantes
          </h2>
          <div className="flex flex-wrap gap-2">
            {operacao.omsParticipantes.length > 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHierarquiaModal(true)}
              >
                Hierarquia
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleAbrirAddOmModal}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar OM
            </Button>
          </div>
        </div>
        {operacao.omsParticipantes.length === 0 ? (
          <p className="text-sm text-olive-600 p-6">
            Nenhuma OM participante ainda. Clique em &quot;Adicionar OM&quot;
            para incluir a primeira.
          </p>
        ) : (
          <>
            {/* Mobile: card list */}
            <div className="sm:hidden space-y-3 p-4">
              {operacao.omsParticipantes.map((omPart) => {
                const hasSubordinadas = (subordinadasCount[omPart.om.id] || 0) > 0;
                return (
                  <div
                    key={omPart.id}
                    className="border border-olive-100 rounded-lg p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-medium text-military-900 break-words">
                        {omPart.om.sigla} - {omPart.om.nome}
                      </div>
                      <span className="shrink-0 font-semibold text-military-900">
                        {formatCurrency(Number(omPart.valorLimite))}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1 text-sm text-olive-600">
                      <span>{omPart.om.tipo}</span>
                      {hasSubordinadas ? (
                        <button
                          onClick={() =>
                            setSelectedOmForModal({
                              id: omPart.om.id,
                              nome: omPart.om.nome,
                              sigla: omPart.om.sigla,
                            })
                          }
                          className="inline-flex items-center gap-1 text-military-700 hover:underline"
                        >
                          {subordinadasCount[omPart.om.id]} subordinada(s)
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      ) : (
                        "—"
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop/tablet: table */}
            <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm mt-4">
              <thead>
                <tr className="border-b border-olive-200 bg-gray-50">
                  <th className="text-left p-3 font-medium text-olive-700">OM</th>
                  <th className="text-left p-3 font-medium text-olive-700">Tipo</th>
                  <th className="text-left p-3 font-medium text-olive-700">Subordinadas</th>
                  <th className="text-right p-3 font-medium text-olive-700">Valor Limite</th>
                </tr>
              </thead>
              <tbody>
                {operacao.omsParticipantes.map((omPart) => {
                  const hasSubordinadas =
                    (subordinadasCount[omPart.om.id] || 0) > 0;

                  return (
                    <tr
                      key={omPart.id}
                      className="border-b border-olive-100 last:border-0 hover:bg-gray-50"
                    >
                      <td className="p-3 font-medium text-military-900">
                        {omPart.om.sigla} - {omPart.om.nome}
                      </td>
                      <td className="p-3 text-olive-600">{omPart.om.tipo}</td>
                      <td className="p-3 text-olive-600">
                        {hasSubordinadas ? (
                          <button
                            onClick={() =>
                              setSelectedOmForModal({
                                id: omPart.om.id,
                                nome: omPart.om.nome,
                                sigla: omPart.om.sigla,
                              })
                            }
                            className="inline-flex items-center gap-1 text-military-700 hover:underline"
                          >
                            {subordinadasCount[omPart.om.id]} subordinada(s)
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="p-3 text-right font-semibold text-military-900">
                        {formatCurrency(Number(omPart.valorLimite))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </>
        )}
      </div>

      {/* Planos de Trabalho (separados por tipo) */}
      {operacao.omsParticipantes.length > 0 && (
        <div className="bg-white rounded-lg border border-olive-200 p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-1">
            <h2 className="text-xl font-semibold text-military-900">
              Planos de Trabalho
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                {TIPOS_PLANO.map((tp) => (
                  <button
                    key={tp.value}
                    onClick={() => setTipoPlanoAtivo(tp.value)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                      tipoPlanoAtivo === tp.value
                        ? "bg-white text-military-900 shadow-sm"
                        : "text-olive-600 hover:text-military-900"
                    }`}
                  >
                    {tp.label}
                  </button>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowImportarModal(true)}
              >
                <Upload className="w-4 h-4 mr-1" />
                Importar P Trab
              </Button>
            </div>
          </div>
          <p className="text-xs text-olive-600 mb-4">
            {tipoPlanoAtivo === "LOGISTICO"
              ? "Despesas de apoio à tropa: alimentação, combustível, material, manutenção (Classes I a X)."
              : "Despesas da execução da operação: diárias, passagens, serviços, equipamentos (GND 3 e GND 4)."}
          </p>

          {(() => {
            const linhas = operacao.omsParticipantes.flatMap((omPart) =>
              getPlanosByOm(omPart.omId, tipoPlanoAtivo).map((plano) => ({ omPart, plano }))
            );
            if (linhas.length === 0) {
              return (
                <p className="p-4 text-center text-olive-600 bg-white border border-olive-100 rounded-lg">
                  Nenhum plano{" "}
                  {TIPOS_PLANO.find((tp) => tp.value === tipoPlanoAtivo)?.label}{" "}
                  cadastrado nesta operação ainda.
                </p>
              );
            }
            return (
              <>
                {/* Mobile: card list */}
                <div className="sm:hidden space-y-3">
                  {linhas.map(({ omPart, plano }) => (
                    <div key={plano.id} className="border border-olive-100 rounded-lg p-3">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <Link
                          href={`/dashboard/planos/${plano.id}`}
                          className="font-medium text-military-900 hover:underline break-words"
                        >
                          {plano.titulo}
                        </Link>
                        <span
                          className={`shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                            plano.status
                          )}`}
                        >
                          {plano.status === "APROVADO" ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : (
                            <Clock className="w-3 h-3" />
                          )}
                          {getStatusPlanoLabel(plano.status)}
                        </span>
                      </div>
                      {plano.importado && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 mb-1">
                          Importado
                        </span>
                      )}
                      <div className="flex items-center justify-between text-sm text-olive-600">
                        <span>{omPart.om.sigla} - {omPart.om.nome}</span>
                        <span>v{plano.versao}</span>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="font-semibold text-military-900">
                          {formatCurrency(Number(plano.valorTotalDespesas || 0))}
                        </span>
                        <Link href={`/dashboard/planos/${plano.id}`}>
                          <Button variant="outline" size="sm">
                            Abrir
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop/tablet: table */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-olive-200 bg-gray-50">
                        <th className="text-left p-3 font-medium text-olive-700">OM</th>
                        <th className="text-left p-3 font-medium text-olive-700">Título</th>
                        <th className="text-right p-3 font-medium text-olive-700">Versão</th>
                        <th className="text-right p-3 font-medium text-olive-700">Valor</th>
                        <th className="text-left p-3 font-medium text-olive-700">Status</th>
                        <th className="text-right p-3 font-medium text-olive-700"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {linhas.map(({ omPart, plano }) => (
                        <tr
                          key={plano.id}
                          className="border-b border-olive-100 last:border-0 hover:bg-gray-50"
                        >
                          <td className="p-3 text-military-900">
                            {omPart.om.sigla} - {omPart.om.nome}
                          </td>
                          <td className="p-3">
                            <Link
                              href={`/dashboard/planos/${plano.id}`}
                              className="font-medium text-military-900 hover:underline"
                            >
                              {plano.titulo}
                            </Link>
                            {plano.importado && (
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                Importado
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right text-olive-600">
                            {plano.versao}
                          </td>
                          <td className="p-3 text-right text-olive-600">
                            {formatCurrency(Number(plano.valorTotalDespesas || 0))}
                          </td>
                          <td className="p-3">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                                plano.status
                              )}`}
                            >
                              {plano.status === "APROVADO" ? (
                                <CheckCircle2 className="w-3 h-3" />
                              ) : (
                                <Clock className="w-3 h-3" />
                              )}
                              {getStatusPlanoLabel(plano.status)}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <Link href={`/dashboard/planos/${plano.id}`}>
                              <Button variant="outline" size="sm">
                                Abrir
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            );
          })()}

          <div className="mt-3">
            {(() => {
              // Toda OM participante pode receber um novo plano, sem
              // restrição de ser a OM do usuário logado (qualquer usuário
              // autenticado pode criar planos de trabalho).
              return (
                <div className="flex flex-wrap gap-2">
                  {operacao.omsParticipantes.map((omPart) => (
                    <Link
                      key={omPart.id}
                      href={`/dashboard/planos/novo?operacaoId=${operacao.id}&tipo=${tipoPlanoAtivo}&omId=${omPart.omId}`}
                      className="inline-flex items-center gap-2 px-3 py-1.5 border-2 border-dashed border-olive-300 rounded-lg text-olive-700 hover:border-military-400 hover:text-military-700 hover:bg-white transition-colors text-sm font-medium"
                    >
                      <Plus className="w-4 h-4" />
                      Criar plano para {omPart.om.sigla}
                    </Link>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Campos Descritivos */}
      {(operacao.finalidade ||
        operacao.motivacao ||
        operacao.consequenciaNaoAtendimento ||
        operacao.observacoes) && (
        <div className="bg-white rounded-lg border border-olive-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-military-900 mb-4">
            Detalhes da Operação
          </h2>

          <div className="space-y-4">
            {operacao.finalidade && (
              <div>
                <h3 className="text-sm font-semibold text-military-700 mb-2">
                  Finalidade
                </h3>
                <p className="text-olive-800 whitespace-pre-wrap">
                  {operacao.finalidade}
                </p>
              </div>
            )}

            {operacao.motivacao && (
              <div>
                <h3 className="text-sm font-semibold text-military-700 mb-2">
                  Motivação
                </h3>
                <p className="text-olive-800 whitespace-pre-wrap">
                  {operacao.motivacao}
                </p>
              </div>
            )}

            {operacao.consequenciaNaoAtendimento && (
              <div>
                <h3 className="text-sm font-semibold text-military-700 mb-2">
                  Consequência do Não Atendimento
                </h3>
                <p className="text-olive-800 whitespace-pre-wrap">
                  {operacao.consequenciaNaoAtendimento}
                </p>
              </div>
            )}

            {operacao.observacoes && (
              <div>
                <h3 className="text-sm font-semibold text-military-700 mb-2">
                  Observações
                </h3>
                <p className="text-olive-800 whitespace-pre-wrap">
                  {operacao.observacoes}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Assinatura (nome/posto/função + consolidado-separado) */}
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
        omsParaOrdenar={omsParaOrdenarAssinatura}
        setOmsParaOrdenar={setOmsParaOrdenarAssinatura}
      />

      {/* Modal de ordenação de OMs (exportação "separado por OM") */}
      <ModalOrdenarOms
        isOpen={showOrdenarModal}
        onClose={() => {
          setShowOrdenarModal(false);
          setAcaoExportPendente(null);
        }}
        onConfirm={confirmarOrdemExport}
        itensIniciais={omsParaOrdenarExport}
      />

      {/* Modal de Editar Operação */}
      <ModalEditarOperacao
        isOpen={showEditarModal}
        onClose={() => setShowEditarModal(false)}
        operacao={operacao}
        onSuccess={fetchOperacao}
      />

      {/* Modal de Hierarquia das OMs na Operação */}
      <ModalHierarquiaOperacao
        isOpen={showHierarquiaModal}
        onClose={() => setShowHierarquiaModal(false)}
        operacaoId={operacao.id}
        participantes={operacao.omsParticipantes}
        onSalvo={fetchOperacao}
      />

      {/* Modal de Adicionar OM Participante */}
      {showAddOmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Adicionar OM Participante
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Busque e selecione qualquer OM do sistema e informe o valor
              limite destinado a ela nesta operação.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  OM
                </label>
                <SeletorOmBusca
                  oms={omsDisponiveisParaAdicionar}
                  value={novoOmId}
                  onChange={setNovoOmId}
                  disabled={loadingTodasOms}
                  placeholder={
                    loadingTodasOms
                      ? "Carregando OMs..."
                      : "Buscar OM por nome ou sigla..."
                  }
                />
                {!loadingTodasOms && omsDisponiveisParaAdicionar.length === 0 && (
                  <p className="text-xs text-amber-700 mt-1">
                    Todas as OMs já participam desta operação.
                  </p>
                )}
                {user?.role === "SUPER_ADMIN" && !showNovaOmForm && (
                  <button
                    type="button"
                    onClick={() => setShowNovaOmForm(true)}
                    className="text-xs text-military-700 hover:underline mt-1"
                  >
                    Não encontrou a OM? Cadastrar nova
                  </button>
                )}
                {showNovaOmForm && (
                  <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Input
                        label="Nome"
                        value={novaOmNome}
                        onChange={(e) => setNovaOmNome(e.target.value)}
                        placeholder="Ex: Centro de Inteligência do Exército"
                      />
                      <Input
                        label="Sigla"
                        value={novaOmSigla}
                        onChange={(e) => setNovaOmSigla(e.target.value)}
                        placeholder="Ex: CIE"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Tipo
                        </label>
                        <select
                          value={novaOmTipo}
                          onChange={(e) => setNovaOmTipo(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-military-500 bg-white text-sm"
                        >
                          <option value="COMPANHIA">Companhia</option>
                          <option value="BATALHAO">Batalhão</option>
                          <option value="BRIGADA">Brigada</option>
                          <option value="GRUPAMENTO">Grupamento</option>
                          <option value="CMA">CMA</option>
                          <option value="COTER">COTER</option>
                        </select>
                      </div>
                      <Input
                        label="CODUG (opcional)"
                        value={novaOmCodUG}
                        onChange={(e) => setNovaOmCodUG(e.target.value)}
                        placeholder="Ex: 160062"
                      />
                    </div>
                    {erroNovaOm && (
                      <p className="text-sm text-red-600">{erroNovaOm}</p>
                    )}
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowNovaOmForm(false)}
                        disabled={isCriandoOm}
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={handleCriarOm}
                        isLoading={isCriandoOm}
                      >
                        Cadastrar OM
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              <Input
                label="Valor Limite (R$)"
                type="number"
                min="0"
                step="0.01"
                value={novoValorLimite}
                onChange={(e) => setNovoValorLimite(e.target.value)}
                placeholder="Ex: 50000"
              />
            </div>
            {erroAddOm && (
              <p className="text-sm text-red-600 mt-2">{erroAddOm}</p>
            )}
            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => setShowAddOmModal(false)}
                disabled={isAddingOm}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={handleAddOm}
                isLoading={isAddingOm}
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Gerar DOR */}
      {showDorModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Gerar DOR
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Dados usados no cabeçalho da DOR (Documento de Oficialização da
              Requisição). Ficam salvos na operação para a próxima geração.
            </p>
            <div className="space-y-3">
              <Input
                label="Órgão requisitante"
                value={dorOrgao}
                onChange={(e) => setDorOrgao(e.target.value)}
                placeholder="Ex: COMANDO MILITAR DA AMAZÔNIA"
              />
              <Input
                label="Responsável pela demanda"
                value={dorResponsavel}
                onChange={(e) => setDorResponsavel(e.target.value)}
                placeholder="Ex: Gen Bda FULANO DE TAL"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="E-mail"
                  type="email"
                  value={dorEmail}
                  onChange={(e) => setDorEmail(e.target.value)}
                  placeholder="contato@eb.mil.br"
                />
                <Input
                  label="Telefone"
                  value={dorTelefone}
                  onChange={(e) => setDorTelefone(e.target.value)}
                  placeholder="(92) 0000-0000"
                />
              </div>
              <Input
                label="Número da DOR (opcional)"
                value={dorNumero}
                onChange={(e) => setDorNumero(e.target.value)}
                placeholder="Ex: 37"
              />
            </div>
            {erroDor && <p className="text-sm text-red-600 mt-3">{erroDor}</p>}
            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => setShowDorModal(false)}
                disabled={isGerandoDor}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={handleGerarDor}
                isLoading={isGerandoDor}
              >
                Gerar DOR
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Importar P Trab */}
      <ModalImportarPTrab
        isOpen={showImportarModal}
        onClose={() => setShowImportarModal(false)}
        operacaoId={operacao.id}
        omsParticipantes={operacao.omsParticipantes.map((p) => ({
          omId: p.omId,
          om: { sigla: p.om.sigla, nome: p.om.nome },
        }))}
        onImportado={fetchOperacao}
      />

      {/* Modal de OMs Subordinadas */}
      {selectedOmForModal && (
        <ModalOmsSubordinadas
          isOpen={!!selectedOmForModal}
          onClose={() => setSelectedOmForModal(null)}
          omParticipante={selectedOmForModal}
          operacaoId={operacao.id}
          planosTrabalho={operacao.planosTrabalho.map((p) => ({
            id: p.id,
            omId: p.omId,
            status: p.status,
            tipo: p.tipo,
          }))}
        />
      )}
    </div>
  );
}
