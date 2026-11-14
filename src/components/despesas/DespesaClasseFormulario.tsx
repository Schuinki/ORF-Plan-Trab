"use client";

import { useEffect } from "react";
import { RateioNaturezas } from "./RateioNaturezas";
import {
  FormularioClasseI,
  FormularioClasseII,
  FormularioClasseIII,
  FormularioClasseIV,
  FormularioClasseV,
  FormularioClasseVI,
  FormularioClasseVII,
  FormularioClasseVIII,
  FormularioClasseIX,
  FormularioClasseX,
} from "./formularios";
import type { Tipo } from "@prisma/client";
import type {
  NaturezaSelect,
  OperacaoWithEfetivo,
  RateioNatureza,
  HandleParametrosChange,
  UserOM,
} from "@/types/despesas";

/** Subconjunto de Tipo compatível com a resposta mais estreita de GET /api/classes/[id]/tipos. */
export type TipoLike = Pick<Tipo, "id" | "nome" | "isCombustivel"> &
  Partial<Pick<Tipo, "classeId" | "isCriavelUsuario" | "createdAt" | "updatedAt">>;

interface DespesaClasseFormularioProps {
  classeId: string;
  classeNome: string;
  naturezasPermitidas: string[];
  tipos: TipoLike[];
  tipoId: string | null;
  parametros: unknown;
  rateioNaturezas: RateioNatureza[];
  operacao: OperacaoWithEfetivo;
  userOm: UserOM | null;
  planoOm: UserOM | null;
  naturezas: NaturezaSelect[];
  onParametrosChange: (p: HandleParametrosChange) => void;
  onRateioNaturezasChange: (r: RateioNatureza[]) => void;
  parametrosError?: string;
  rateioNaturezasError?: string;
}

/**
 * Renderiza o formulário real da Classe (FormularioClasseI..X) + o rateio por
 * Natureza, a partir de uma Classe/Tipo já resolvidos. Extraído de
 * ModalCriarDespesa.tsx para ser reaproveitado também pela Entrada Rápida —
 * garante que o carimbo gerado seja idêntico nos dois fluxos, porque é
 * literalmente o mesmo código rodando.
 */
export function DespesaClasseFormulario({
  classeId,
  classeNome,
  naturezasPermitidas,
  tipos,
  tipoId,
  parametros,
  rateioNaturezas,
  operacao,
  userOm,
  planoOm,
  naturezas,
  onParametrosChange,
  onRateioNaturezasChange,
  parametrosError,
  rateioNaturezasError,
}: DespesaClasseFormularioProps) {
  // Tipo dummy quando a classe não tem nenhum Tipo cadastrado — permite o
  // formulário renderizar mesmo assim (mesma síntese que ModalCriarDespesa
  // fazia antes desta extração).
  const tipoResolvido: Tipo | null =
    tipos.length === 0
      ? ({
          id: "NO_TYPE",
          nome: "Sem tipo específico",
          classeId,
          isCombustivel: false,
          isCriavelUsuario: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as Tipo)
      : ((tipos.find((t) => t.id === tipoId) as Tipo | undefined) ?? null);

  // Auto-preenche a Natureza a 100% quando só há uma permitida para a classe.
  useEffect(() => {
    if (naturezas.length === 0 || rateioNaturezas.length > 0) return;
    const naturezasFiltradas = naturezas.filter((nat) =>
      naturezasPermitidas.includes(nat.codigo)
    );
    if (naturezasFiltradas.length === 1) {
      onRateioNaturezasChange([
        { naturezaId: naturezasFiltradas[0].id, percentual: 100 },
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classeNome, naturezas, naturezasPermitidas, rateioNaturezas.length]);

  const commonProps = {
    onChange: onParametrosChange,
    operacao,
    userOm,
    planoOm,
    naturezas,
    rateioNaturezas,
  };

  const renderFormularioClasse = () => {
    if (!tipoResolvido) return null;

    switch (classeNome) {
      case "CLASSE_I":
        return (
          <FormularioClasseI
            value={parametros as any}
            tipo={tipoResolvido}
            {...commonProps}
          />
        );
      case "CLASSE_II":
        return (
          <FormularioClasseII value={parametros as any} {...commonProps} />
        );
      case "CLASSE_III":
        return (
          <FormularioClasseIII
            tipoSelecionado={tipoResolvido}
            value={parametros as any}
            {...commonProps}
          />
        );
      case "CLASSE_IV":
        return (
          <FormularioClasseIV value={parametros as any} {...commonProps} />
        );
      case "CLASSE_V":
        return <FormularioClasseV value={parametros as any} {...commonProps} />;
      case "CLASSE_VI":
        return (
          <FormularioClasseVI value={parametros as any} {...commonProps} />
        );
      case "CLASSE_VII":
        return (
          <FormularioClasseVII value={parametros as any} {...commonProps} />
        );
      case "CLASSE_VIII":
        return (
          <FormularioClasseVIII value={parametros as any} {...commonProps} />
        );
      case "CLASSE_IX":
        return (
          <FormularioClasseIX value={parametros as any} {...commonProps} />
        );
      case "CLASSE_X":
        return <FormularioClasseX value={parametros as any} {...commonProps} />;
      default:
        return null;
    }
  };

  return (
    <>
      <div className="border-t pt-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          Parâmetros de Cálculo - {classeNome}
        </h3>
        {renderFormularioClasse()}
        {parametrosError && (
          <p className="text-sm text-red-600 mt-2">{parametrosError}</p>
        )}
      </div>

      <div className="border-t pt-4">
        <RateioNaturezas
          naturezas={naturezas}
          naturezasPermitidas={naturezasPermitidas}
          value={rateioNaturezas}
          onChange={onRateioNaturezasChange}
          error={rateioNaturezasError}
        />
      </div>
    </>
  );
}
