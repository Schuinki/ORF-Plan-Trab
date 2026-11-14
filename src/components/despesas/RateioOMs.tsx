'use client';

import { useState, useEffect } from 'react';
import { X, Plus, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import type { OMSelect, RateioOM } from '@/types/despesas';

interface RateioOMsProps {
  oms: OMSelect[];
  value: RateioOM[];
  onChange: (rateio: RateioOM[]) => void;
  error?: string;
  /** true enquanto a lista de OMs ainda está sendo carregada */
  loadingOms?: boolean;
}

export function RateioOMs({
  oms,
  value,
  onChange,
  error,
  loadingOms,
}: RateioOMsProps) {
  const [somaPercentuais, setSomaPercentuais] = useState(0);
  // Texto em edição por linha (permite digitar "0", "0." etc. sem o campo "pular")
  const [textos, setTextos] = useState<Record<string, string>>({});

  useEffect(() => {
    const soma = value.reduce((acc, r) => acc + Number(r.percentual), 0);
    setSomaPercentuais(Number(soma.toFixed(2)));
  }, [value]);

  // Chave estável por linha: OM destino quando selecionada; só existe no
  // máximo uma linha sem OM por vez (ver handleAdd), então "" não colide.
  const rowKey = (rateio: RateioOM) => rateio.omDestinoId || '__nova__';

  const temLinhaSemOm = value.some((r) => !r.omDestinoId);

  const handleAdd = () => {
    // Não auto-seleciona OM: o usuário escolhe. Bloqueia nova linha
    // enquanto houver uma sem OM selecionada.
    if (temLinhaSemOm) return;
    onChange([
      ...value,
      { omDestinoId: '', omCompradoraId: '', percentual: 0 },
    ]);
  };

  const handleRemove = (index: number) => {
    const removida = value[index];
    const novoRateio = value.filter((_, i) => i !== index);
    onChange(novoRateio);
    if (removida) {
      setTextos((prev) => {
        const { [rowKey(removida)]: _removido, ...rest } = prev;
        return rest;
      });
    }
  };

  const handlePercentualChange = (index: number, texto: string) => {
    const key = rowKey(value[index]);
    // Aceita apenas número parcial válido (vazio, "12", "12.", "12.5")
    if (!/^\d*[.,]?\d*$/.test(texto)) return;

    const valor = texto === '' ? 0 : Number(texto.replace(',', '.'));
    if (Number.isNaN(valor) || valor < 0 || valor > 100) return;

    setTextos((prev) => ({ ...prev, [key]: texto }));
    const novoRateio = [...value];
    novoRateio[index] = { ...novoRateio[index], percentual: valor };
    onChange(novoRateio);
  };

  // Por padrão a OM compradora acompanha a OM destino (caso mais comum).
  // O usuário só vê um segundo seletor quando escolhe "OM compradora diferente".
  const handleOmDestinoChange = (index: number, omDestinoId: string) => {
    const anterior = value[index];
    const novoRateio = [...value];
    const mesmaOm = anterior.omCompradoraId === anterior.omDestinoId;
    novoRateio[index] = {
      ...novoRateio[index],
      omDestinoId,
      omCompradoraId: mesmaOm ? omDestinoId : novoRateio[index].omCompradoraId,
    };
    onChange(novoRateio);
    setTextos((prev) => {
      const { [rowKey(anterior)]: texto, ...rest } = prev;
      return texto !== undefined
        ? { ...rest, [omDestinoId || '__nova__']: texto }
        : rest;
    });
  };

  const handleOmCompradoraChange = (index: number, omCompradoraId: string) => {
    const novoRateio = [...value];
    novoRateio[index] = { ...novoRateio[index], omCompradoraId };
    onChange(novoRateio);
  };

  const handleToggleMesmaOm = (index: number, mesma: boolean) => {
    const novoRateio = [...value];
    // Ao desmarcar, esvazia a OM compradora para forçar uma escolha
    // explícita — caso contrário ela continuaria igual à OM destino e o
    // checkbox "voltaria" a aparecer marcado (mesmaOm é derivado por igualdade).
    novoRateio[index] = {
      ...novoRateio[index],
      omCompradoraId: mesma ? novoRateio[index].omDestinoId : '',
    };
    onChange(novoRateio);
  };

  const omsDisponiveis = (omIdAtual?: string) => {
    const omsAdicionadas = value
      .map((r) => r.omDestinoId)
      .filter((id) => id && id !== omIdAtual);
    return oms.filter((om) => !omsAdicionadas.includes(om.id));
  };

  const textoPercentual = (rateio: RateioOM) => {
    const emEdicao = textos[rowKey(rateio)];
    if (emEdicao !== undefined) return emEdicao;
    return rateio.percentual ? String(rateio.percentual) : '';
  };

  const isSomaCorreta = Math.abs(somaPercentuais - 100) < 0.01;
  const todasOmsUsadas =
    oms.length > 0 &&
    value.filter((r) => r.omDestinoId).length >= oms.length;

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
        <label className="block text-sm font-medium text-gray-700">
          Rateio por OMs <span className="text-red-500">*</span>
        </label>
        {value.length > 0 && (
          <div
            className={`flex items-center gap-1.5 text-sm font-medium ${
              isSomaCorreta ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {isSomaCorreta ? (
              <>
                <CheckCircle className="w-4 h-4" />
                <span>Soma: {somaPercentuais.toFixed(2)}%</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4" />
                <span>Soma: {somaPercentuais.toFixed(2)}% (deve ser 100%)</span>
              </>
            )}
          </div>
        )}
      </div>

      <div className="space-y-2">
        {value.map((rateio, index) => {
          const mesmaOm = rateio.omCompradoraId === rateio.omDestinoId;
          return (
            <div
              key={rowKey(rateio)}
              className="border border-gray-200 rounded-md p-2 space-y-2"
            >
              <div className="flex flex-col sm:flex-row gap-2 sm:items-start">
                <div className="flex-1 min-w-0">
                  <select
                    value={rateio.omDestinoId}
                    onChange={(e) => handleOmDestinoChange(index, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-600 focus:border-transparent text-sm"
                  >
                    <option value="">Selecione a OM destino</option>
                    {omsDisponiveis(rateio.omDestinoId).map((om) => (
                      <option key={om.id} value={om.id}>
                        {om.sigla} - {om.nome} (UG: {om.codUG})
                      </option>
                    ))}
                    {/* Mantém visível uma OM já salva que não está na lista atual */}
                    {rateio.omDestinoId &&
                      !oms.some((om) => om.id === rateio.omDestinoId) && (
                        <option value={rateio.omDestinoId}>
                          OM fora da operação
                        </option>
                      )}
                  </select>
                </div>

                <div className="flex gap-2 sm:items-start">
                  <div className="w-28 sm:w-28 flex-1 sm:flex-none">
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={textoPercentual(rateio)}
                        onChange={(e) =>
                          handlePercentualChange(index, e.target.value)
                        }
                        placeholder="0.00"
                        className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-600 focus:border-transparent text-sm"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm pointer-events-none">
                        %
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemove(index)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors shrink-0"
                    title="Remover OM"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs text-gray-600">
                <input
                  type="checkbox"
                  checked={mesmaOm}
                  onChange={(e) => handleToggleMesmaOm(index, e.target.checked)}
                />
                A OM compradora (CODUG do empenho) é a mesma OM destino
              </label>

              {!mesmaOm && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    OM compradora (CODUG usado na DOR/empenho)
                  </label>
                  <select
                    value={rateio.omCompradoraId}
                    onChange={(e) =>
                      handleOmCompradoraChange(index, e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-600 focus:border-transparent text-sm"
                  >
                    <option value="">Selecione a OM compradora</option>
                    {oms.map((om) => (
                      <option key={om.id} value={om.id}>
                        {om.sigla} - {om.nome} (UG: {om.codUG})
                      </option>
                    ))}
                    {rateio.omCompradoraId &&
                      !oms.some((om) => om.id === rateio.omCompradoraId) && (
                        <option value={rateio.omCompradoraId}>
                          OM fora da operação
                        </option>
                      )}
                  </select>
                </div>
              )}
            </div>
          );
        })}

        {loadingOms ? (
          <div className="w-full px-3 py-2 border-2 border-dashed border-gray-300 rounded-md text-sm text-gray-500 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Carregando OMs...
          </div>
        ) : oms.length === 0 ? (
          <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 px-3 py-2 rounded-md">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>
              Nenhuma OM disponível para rateio. Verifique as OMs participantes
              da operação.
            </span>
          </div>
        ) : (
          !todasOmsUsadas && (
            <button
              type="button"
              onClick={handleAdd}
              disabled={temLinhaSemOm}
              className="w-full px-3 py-2 border-2 border-dashed border-gray-300 rounded-md text-sm text-gray-600 hover:border-green-600 hover:text-green-700 hover:bg-green-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-300 disabled:hover:text-gray-600 disabled:hover:bg-transparent"
            >
              <Plus className="w-4 h-4" />
              {temLinhaSemOm
                ? 'Selecione a OM da linha acima antes de adicionar outra'
                : 'Adicionar OM ao rateio'}
            </button>
          )
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {value.length === 0 && (
        <p className="text-sm text-gray-500">
          Adicione ao menos uma OM para distribuir os custos desta despesa.
        </p>
      )}
    </div>
  );
}
