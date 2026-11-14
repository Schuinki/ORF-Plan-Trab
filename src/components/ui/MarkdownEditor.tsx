"use client";

import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Bold,
  Italic,
  Heading2,
  List,
  ListOrdered,
  Link as LinkIcon,
  Table as TableIcon,
  Eye,
  Pencil,
} from "lucide-react";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
  required?: boolean;
}

interface ToolbarAction {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  apply: (selected: string) => { text: string; cursorOffset?: number };
}

const TABLE_SNIPPET = `| Coluna 1 | Coluna 2 |\n| --- | --- |\n| Valor 1 | Valor 2 |`;

const ACTIONS: ToolbarAction[] = [
  {
    label: "Negrito",
    icon: Bold,
    apply: (selected) => ({ text: `**${selected || "texto"}**` }),
  },
  {
    label: "Itálico",
    icon: Italic,
    apply: (selected) => ({ text: `_${selected || "texto"}_` }),
  },
  {
    label: "Título",
    icon: Heading2,
    apply: (selected) => ({ text: `## ${selected || "Título"}` }),
  },
  {
    label: "Lista",
    icon: List,
    apply: (selected) => ({
      text: (selected || "item").split("\n").map((l) => `- ${l}`).join("\n"),
    }),
  },
  {
    label: "Lista numerada",
    icon: ListOrdered,
    apply: (selected) => ({
      text: (selected || "item")
        .split("\n")
        .map((l, i) => `${i + 1}. ${l}`)
        .join("\n"),
    }),
  },
  {
    label: "Link",
    icon: LinkIcon,
    apply: (selected) => ({ text: `[${selected || "texto do link"}](https://)` }),
  },
  {
    label: "Tabela",
    icon: TableIcon,
    apply: () => ({ text: TABLE_SNIPPET }),
  },
];

export function MarkdownEditor({
  value,
  onChange,
  rows = 16,
  placeholder,
  required,
}: MarkdownEditorProps) {
  const [mode, setMode] = useState<"editar" | "preview">("editar");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleToolbarClick = (action: ToolbarAction) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const { selectionStart, selectionEnd } = textarea;
    const selected = value.slice(selectionStart, selectionEnd);
    const { text } = action.apply(selected);

    const novoValor =
      value.slice(0, selectionStart) + text + value.slice(selectionEnd);
    onChange(novoValor);

    requestAnimationFrame(() => {
      textarea.focus();
      const novaPosicao = selectionStart + text.length;
      textarea.setSelectionRange(novaPosicao, novaPosicao);
    });
  };

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between bg-gray-50 border-b border-gray-300 px-2 py-1.5 flex-wrap gap-1">
        <div className="flex items-center gap-1 flex-wrap">
          {ACTIONS.map((action) => (
            <button
              key={action.label}
              type="button"
              title={action.label}
              onClick={() => handleToolbarClick(action)}
              disabled={mode === "preview"}
              className="p-1.5 rounded hover:bg-gray-200 text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <action.icon className="w-4 h-4" />
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 bg-gray-200 rounded-md p-0.5">
          <button
            type="button"
            onClick={() => setMode("editar")}
            className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded ${
              mode === "editar" ? "bg-white shadow-sm text-gray-900" : "text-gray-600"
            }`}
          >
            <Pencil className="w-3 h-3" />
            Editar
          </button>
          <button
            type="button"
            onClick={() => setMode("preview")}
            className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded ${
              mode === "preview" ? "bg-white shadow-sm text-gray-900" : "text-gray-600"
            }`}
          >
            <Eye className="w-3 h-3" />
            Pré-visualizar
          </button>
        </div>
      </div>

      {mode === "editar" ? (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          className="w-full px-3 py-2 focus:outline-none font-mono text-sm resize-y"
          placeholder={placeholder}
          required={required}
        />
      ) : (
        <div
          className="prose prose-sm max-w-none p-3 overflow-x-auto bg-white"
          style={{ minHeight: `${rows * 1.5}rem` }}
        >
          {value.trim() ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
          ) : (
            <p className="text-gray-400 italic">Nada para pré-visualizar ainda.</p>
          )}
        </div>
      )}
    </div>
  );
}
