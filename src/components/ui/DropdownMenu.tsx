"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

interface DropdownMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  /** Separa visualmente este item dos anteriores (ex: antes de uma ação destrutiva). */
  separatorBefore?: boolean;
  danger?: boolean;
}

interface DropdownMenuProps {
  label: string;
  icon?: React.ReactNode;
  items: DropdownMenuItem[];
  variant?: "outline" | "ghost";
}

/**
 * Agrupa ações secundárias (exportar, importar, excluir...) atrás de um
 * único botão, em vez de empilhar vários botões no cabeçalho da página.
 */
export function DropdownMenu({
  label,
  icon,
  items,
  variant = "outline",
}: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const triggerClasses =
    variant === "outline"
      ? "bg-white border border-olive-300 text-olive-800 hover:bg-olive-50"
      : "bg-transparent text-olive-700 hover:bg-olive-100";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-base transition-colors focus:outline-none focus:ring-2 focus:ring-olive-400 focus:ring-offset-2 ${triggerClasses}`}
      >
        {icon}
        {label}
        <ChevronDown
          className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-56 max-w-[90vw] bg-white border border-gray-200 rounded-lg shadow-lg z-30 py-1">
          {items.map((item, idx) => (
            <div key={idx}>
              {item.separatorBefore && (
                <div className="my-1 border-t border-gray-100" />
              )}
              <button
                type="button"
                disabled={item.disabled}
                onClick={() => {
                  setOpen(false);
                  item.onClick();
                }}
                className={`w-full flex items-center gap-2 px-4 py-2 text-sm text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  item.danger
                    ? "text-red-700 hover:bg-red-50"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
