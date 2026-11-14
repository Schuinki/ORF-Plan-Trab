"use client";

import { useState, useEffect } from "react";
import { PreviewCalculo } from "../PreviewCalculo";
import { HandleParametrosChange } from "../ModalCriarDespesa";
import type { OperacaoWithEfetivo, UserOM, NaturezaSelect, RateioNatureza } from "@/types/despesas";
import { calcularClasseX, type ParametrosClasseX } from "@/lib/calculos/classeX";

interface FormularioClasseXProps {
  value: ParametrosClasseX | null;
  onChange: (params: HandleParametrosChange) => void;
  operacao: OperacaoWithEfetivo;
  userOm: UserOM | null;
  planoOm: UserOM | null;
  naturezas: NaturezaSelect[];
  rateioNaturezas: RateioNatureza[];
}

export function FormularioClasseX({
  value,
  onChange,
  operacao,
  userOm,
  planoOm,
  naturezas,
  rateioNaturezas,
}: FormularioClasseXProps) {
  const [params, setParams] = useState<ParametrosClasseX>(
    value || {
      quantidade: 0,
      valorUnitario: 0,
      descricaoDetalhada: "",
    }
  );

  const [valorTotal, setValorTotal] = useState<number | null>(null);
  const [carimbo, setCarimbo] = useState<string>("");
  const [carimboEditadoManualmente, setCarimboEditadoManualmente] =
    useState(false);

  // Mapear naturezas selecionadas para códigos
  const getNaturezasCodigos = () => {
    return rateioNaturezas
      .map(rateio => naturezas.find(n => n.id === rateio.naturezaId)?.codigo)
      .filter((codigo): codigo is string => codigo !== undefined);
  };

  useEffect(() => {
    calcular();
  }, [params]);

  const calcular = () => {
    try {
      const resultado = calcularClasseX(
        params,
        planoOm?.sigla,
        operacao.nome,
        getNaturezasCodigos()
      );
      setValorTotal(resultado.valorTotal);
      setCarimbo(resultado.carimbo);
      setCarimboEditadoManualmente(false);
      onChange({ params, valor: resultado.valorTotal, descricao: resultado.carimbo });
    } catch {
      setValorTotal(null);
      setCarimbo("");
    }
  };

  const handleChange = (field: keyof ParametrosClasseX, value: any) => {
    setParams((prev) => ({ ...prev, [field]: value }));
  };

  const handleCarimboChange = (novoCarimbo: string) => {
    setCarimbo(novoCarimbo);
    setCarimboEditadoManualmente(true);
    onChange({ params, valor: valorTotal || 0, descricao: novoCarimbo });
  };

  const handleResetCarimbo = () => {
    setCarimboEditadoManualmente(false);
    calcular();
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-300 rounded-md p-3">
        <p className="text-sm text-blue-800">
          <strong>Classe X - Material Não Classificado</strong>
        </p>
        <p className="text-xs text-blue-700 mt-1">
          Esta classe é para materiais que não se enquadram nas outras classes
          (I a IX). Forneça uma descrição detalhada do material.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Descrição Detalhada do Material{" "}
          <span className="text-red-500">*</span>
        </label>
        <textarea
          value={params.descricaoDetalhada}
          onChange={(e) => handleChange("descricaoDetalhada", e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-600 focus:border-transparent resize-none"
          placeholder="Descreva detalhadamente o material não classificado nas demais classes..."
        />
        <p className="text-xs text-gray-500 mt-1">
          Explique qual material está sendo solicitado e por que não se enquadra
          em outras classes
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Quantidade <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min="1"
            step="0.01"
            value={params.quantidade || ""}
            onChange={(e) =>
              handleChange("quantidade", parseFloat(e.target.value) || 0)
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-600 focus:border-transparent"
            placeholder="Quantidade de unidades"
          />
          <p className="text-xs text-gray-500 mt-1">
            Quantidade do material a ser adquirido
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Valor Unitário (R$) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={params.valorUnitario || ""}
            onChange={(e) =>
              handleChange("valorUnitario", parseFloat(e.target.value) || 0)
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-600 focus:border-transparent"
            placeholder="0.00"
          />
          <p className="text-xs text-gray-500 mt-1">
            Custo por unidade do material
          </p>
        </div>
      </div>

      <PreviewCalculo valorTotal={valorTotal} />

      {/* Carimbo editável */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700">
            Carimbo
          </label>
          {carimboEditadoManualmente && (
            <button
              type="button"
              onClick={handleResetCarimbo}
              className="text-xs text-blue-600 hover:text-blue-800 underline"
            >
              Restaurar automático
            </button>
          )}
        </div>

        <textarea
          value={carimbo || ""}
          disabled={true}
          onChange={(e) => handleCarimboChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm resize-y min-h-[200px] focus:ring-2 focus:ring-green-600 focus:border-transparent"
          placeholder="O carimbo será gerado automaticamente..."
        />

        <p className="text-xs text-gray-500">
          Este texto será usado como justificativa da despesa. Edite se
          necessário.
        </p>
      </div>
    </div>
  );
}
