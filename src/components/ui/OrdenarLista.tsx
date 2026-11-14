"use client";

import { ArrowUp, ArrowDown } from "lucide-react";

export interface ItemOrdenavel {
  id: string;
  label: string;
  /** false = não entra no documento consolidado. Padrão: incluído (true). */
  incluido?: boolean;
}

interface OrdenarListaProps {
  items: ItemOrdenavel[];
  onChange: (items: ItemOrdenavel[]) => void;
  /** Mostra o checkbox de inclusão/exclusão em cada linha. */
  permitirExcluir?: boolean;
}

/**
 * Lista com botões para mover itens para cima/baixo — usada para deixar o
 * usuário definir a ordem de consolidação das OMs na exportação. Quando
 * `permitirExcluir` está ativo, cada item também tem um checkbox para
 * decidir se entra ou não no documento consolidado.
 */
export function OrdenarLista({
  items,
  onChange,
  permitirExcluir,
}: OrdenarListaProps) {
  const mover = (index: number, direcao: -1 | 1) => {
    const destino = index + direcao;
    if (destino < 0 || destino >= items.length) return;
    const novaLista = [...items];
    [novaLista[index], novaLista[destino]] = [novaLista[destino], novaLista[index]];
    onChange(novaLista);
  };

  const alternarIncluido = (index: number) => {
    const novaLista = [...items];
    novaLista[index] = {
      ...novaLista[index],
      incluido: novaLista[index].incluido === false ? true : false,
    };
    onChange(novaLista);
  };

  return (
    <ul className="border border-olive-200 rounded-lg divide-y divide-olive-100">
      {items.map((item, index) => (
        <li
          key={item.id}
          className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
        >
          {permitirExcluir && (
            <input
              type="checkbox"
              checked={item.incluido !== false}
              onChange={() => alternarIncluido(index)}
              className="shrink-0"
              aria-label={`Incluir ${item.label} no documento`}
            />
          )}
          <span
            className={`break-words min-w-0 flex-1 ${
              item.incluido === false
                ? "text-olive-400 line-through"
                : "text-military-900"
            }`}
          >
            {index + 1}. {item.label}
          </span>
          <div className="flex gap-1 shrink-0">
            <button
              type="button"
              onClick={() => mover(index, -1)}
              disabled={index === 0}
              className="p-1 rounded text-olive-700 hover:bg-olive-100 disabled:opacity-30 disabled:hover:bg-transparent"
              aria-label={`Mover ${item.label} para cima`}
            >
              <ArrowUp className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => mover(index, 1)}
              disabled={index === items.length - 1}
              className="p-1 rounded text-olive-700 hover:bg-olive-100 disabled:opacity-30 disabled:hover:bg-transparent"
              aria-label={`Mover ${item.label} para baixo`}
            >
              <ArrowDown className="w-4 h-4" />
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
