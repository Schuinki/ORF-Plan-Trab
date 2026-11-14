"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { MarkdownEditor } from "@/components/ui/MarkdownEditor";

const CATEGORIAS = [
  { value: "PREGAO", label: "Pregões" },
  { value: "COMPRASNET", label: "ComprasNET" },
  { value: "REGULAMENTO", label: "Regulamentos" },
  { value: "OUTRO", label: "Outro" },
];

interface ArtigoFormProps {
  artigoId?: string;
  valoresIniciais?: {
    titulo: string;
    categoria: string;
    conteudo: string;
  };
}

export function ArtigoForm({ artigoId, valoresIniciais }: ArtigoFormProps) {
  const router = useRouter();
  const isEditing = !!artigoId;

  const [titulo, setTitulo] = useState(valoresIniciais?.titulo || "");
  const [categoria, setCategoria] = useState(
    valoresIniciais?.categoria || "REGULAMENTO"
  );
  const [conteudo, setConteudo] = useState(valoresIniciais?.conteudo || "");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const url = isEditing ? `/api/consulta/${artigoId}` : "/api/consulta";
      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titulo, categoria, conteudo }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao salvar artigo");
      }

      router.push(`/dashboard/consulta/${data.id || artigoId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar artigo");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Input
        label="Título"
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        placeholder="Ex: Como funciona a adesão a um pregão (carona)"
        required
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Categoria <span className="text-red-500">*</span>
        </label>
        <select
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-military-500 bg-white"
        >
          {CATEGORIAS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Conteúdo (Markdown) <span className="text-red-500">*</span>
        </label>
        <MarkdownEditor
          value={conteudo}
          onChange={setConteudo}
          rows={16}
          placeholder={"# Título\n\nTexto com **negrito**, listas, [links](https://...) etc."}
          required
        />
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="flex gap-4">
        <Button type="submit" isLoading={isLoading}>
          {isEditing ? "Salvar Alterações" : "Criar Artigo"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/dashboard/consulta")}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
