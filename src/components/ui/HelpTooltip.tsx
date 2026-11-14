"use client";

import { useState } from "react";
import { HelpCircle } from "lucide-react";

interface HelpTooltipProps {
  /** Texto curto em linguagem simples, sem jargão militar/técnico. */
  children: React.ReactNode;
}

/**
 * Ícone de interrogação que mostra uma explicação em linguagem simples ao
 * clicar/focar. Usado para traduzir termos de regulamento (ND, GND, Pregão,
 * Classe de Despesa, etc.) para quem não é da área.
 */
export function HelpTooltip({ children }: HelpTooltipProps) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setOpen(false)}
        className="text-gray-400 hover:text-military-600 focus:text-military-600 transition-colors"
        aria-label="Ajuda"
      >
        <HelpCircle className="w-4 h-4" />
      </button>
      {open && (
        <span className="absolute z-20 left-0 top-full mt-1 w-64 max-w-[80vw] p-3 text-xs leading-relaxed text-gray-700 bg-white border border-gray-200 rounded-lg shadow-lg">
          {children}
        </span>
      )}
    </span>
  );
}
