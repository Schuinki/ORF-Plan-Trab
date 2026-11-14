"use client";

import { useEffect, useRef, useState } from "react";

interface OMBasica {
  id: string;
  nome: string;
  sigla: string;
  tipo?: string;
}

interface SeletorOmBuscaProps {
  oms: OMBasica[];
  value: string;
  onChange: (omId: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * Campo de busca por nome/sigla para escolher uma OM dentre a lista
 * completa (~65 OMs) sem depender de um <select> gigante. Sem biblioteca
 * de combobox — segue o mesmo padrão "input + lista filtrada" já usado
 * no projeto (ex: datalist de despesas operacionais).
 */
export function SeletorOmBusca({
  oms,
  value,
  onChange,
  placeholder,
  disabled,
}: SeletorOmBuscaProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selecionada = oms.find((om) => om.id === value);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const termo = query.trim().toLowerCase();
  const filtradas = termo
    ? oms.filter((om) =>
        `${om.sigla} ${om.nome}`.toLowerCase().includes(termo)
      )
    : oms;

  return (
    <div className="relative" ref={containerRef}>
      <input
        type="text"
        disabled={disabled}
        value={
          open
            ? query
            : selecionada
              ? `${selecionada.sigla} - ${selecionada.nome}`
              : ""
        }
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setQuery("");
          setOpen(true);
        }}
        placeholder={placeholder || "Buscar OM por nome ou sigla..."}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-600 focus:border-transparent text-sm"
      />
      {open && (
        <div className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto bg-white border border-gray-200 rounded-md shadow-lg">
          {filtradas.length === 0 ? (
            <p className="px-3 py-2 text-sm text-gray-500">
              Nenhuma OM encontrada
            </p>
          ) : (
            filtradas.map((om) => (
              <button
                key={om.id}
                type="button"
                onClick={() => {
                  onChange(om.id);
                  setQuery("");
                  setOpen(false);
                }}
                className="w-full flex items-center justify-between gap-2 text-left px-3 py-2 text-sm text-gray-700 hover:bg-green-50"
              >
                <span>
                  {om.sigla} - {om.nome}
                </span>
                {om.tipo && (
                  <span className="shrink-0 px-1.5 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-500">
                    {om.tipo}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
