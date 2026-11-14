import { Check, Clock, Circle } from "lucide-react";
import { HelpTooltip } from "@/components/ui/HelpTooltip";

interface NivelCadeia {
  nivel: number;
  omSigla: string;
  omNome: string;
  status: "aprovado" | "atual" | "pendente";
}

interface StatusAprovacaoProps {
  nivelAtual: number | null;
  status: string;
  cadeia?: NivelCadeia[];
}

export function StatusAprovacao({
  nivelAtual,
  status,
  cadeia,
}: StatusAprovacaoProps) {
  // Sem cadeia do backend, mostra um único nível genérico (fallback)
  const niveis: NivelCadeia[] =
    cadeia && cadeia.length > 0
      ? cadeia
      : [
          {
            nivel: 1,
            omSigla: "OM",
            omNome: "Organização Militar do plano",
            status:
              status === "APROVADO"
                ? "aprovado"
                : status === "EM_ANALISE" && nivelAtual === 1
                  ? "atual"
                  : "pendente",
          },
        ];

  const nivelStatusVisual = (nivel: NivelCadeia) => {
    if (status === "APROVADO") return "completed";
    if (nivel.status === "aprovado") return "completed";
    if (nivel.status === "atual" && status === "EM_ANALISE") return "current";
    return "pending";
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="flex items-center gap-1.5 text-lg font-semibold text-gray-900 mb-4">
        Esteira de Aprovação
        <HelpTooltip>
          Depois de enviado, o plano sobe nível a nível pela hierarquia (OM →
          escalão superior → escalão seguinte, e assim por diante) até ser
          aprovado. Cada nível precisa aprovar antes do próximo ser liberado.
        </HelpTooltip>
      </h3>

      <div className="space-y-4">
        {niveis.map((nivel) => {
          const visual = nivelStatusVisual(nivel);
          return (
            <div key={nivel.nivel} className="flex items-start">
              <div className="flex-shrink-0 mr-4">
                {visual === "completed" && (
                  <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-full">
                    <Check className="w-5 h-5 text-green-600" />
                  </div>
                )}
                {visual === "current" && (
                  <div className="flex items-center justify-center w-8 h-8 bg-amber-100 rounded-full">
                    <Clock className="w-5 h-5 text-amber-600" />
                  </div>
                )}
                {visual === "pending" && (
                  <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full">
                    <Circle className="w-5 h-5 text-gray-400" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4
                    className={`text-sm font-medium ${
                      visual === "completed"
                        ? "text-green-700"
                        : visual === "current"
                          ? "text-amber-700"
                          : "text-gray-500"
                    }`}
                  >
                    Nível {nivel.nivel} — S4 {nivel.omSigla}
                  </h4>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      visual === "completed"
                        ? "bg-green-100 text-green-700"
                        : visual === "current"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {visual === "completed"
                      ? "Aprovado"
                      : visual === "current"
                        ? "Aguardando"
                        : "Pendente"}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">{nivel.omNome}</p>
              </div>
            </div>
          );
        })}
      </div>

      {status === "RASCUNHO" && (
        <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-md">
          <p className="text-sm text-gray-700">
            Este plano ainda não foi enviado para aprovação.
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Após o envio, a aprovação sobe nível a nível pela hierarquia de OMs.
          </p>
        </div>
      )}

      {status === "EM_ANALISE" && (
        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-md">
          <p className="text-sm text-amber-800 font-medium">
            ⏳ Aguardando aprovação do nível {nivelAtual ?? 1} de{" "}
            {niveis.length}
          </p>
          <p className="text-xs text-amber-700 mt-1">
            O plano está bloqueado para edições até a conclusão da análise.
          </p>
        </div>
      )}

      {status === "APROVADO" && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-800 font-medium">
            ✓ Plano aprovado em todos os níveis!
          </p>
        </div>
      )}

      {status === "REPROVADO" && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800 font-medium">
            ✗ Este plano foi devolvido para correção.
          </p>
          <p className="text-xs text-red-700 mt-1">
            Verifique o motivo no histórico, faça as correções e reenvie para
            análise.
          </p>
        </div>
      )}
    </div>
  );
}
