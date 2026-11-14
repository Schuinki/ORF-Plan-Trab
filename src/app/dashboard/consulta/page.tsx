"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, BookOpen, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useSession } from "@/hooks/useSession";

interface Artigo {
  id: string;
  titulo: string;
  categoria: string;
  updatedAt: string;
  autor: { nomeCompleto: string; nomeGuerra: string | null; postoGraduacao: string };
}

const CATEGORIAS = [
  { value: "", label: "Todas" },
  { value: "PREGAO", label: "Pregões" },
  { value: "COMPRASNET", label: "ComprasNET" },
  { value: "REGULAMENTO", label: "Regulamentos" },
  { value: "OUTRO", label: "Outro" },
];

export default function ConsultaPage() {
  const { user } = useSession();
  const [artigos, setArtigos] = useState<Artigo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [categoriaFiltro, setCategoriaFiltro] = useState("");
  const [busca, setBusca] = useState("");

  useEffect(() => {
    fetchArtigos();
  }, [categoriaFiltro]);

  const fetchArtigos = async () => {
    try {
      setIsLoading(true);
      const url = categoriaFiltro
        ? `/api/consulta?categoria=${categoriaFiltro}`
        : "/api/consulta";
      const response = await fetch(url);
      if (response.ok) {
        setArtigos(await response.json());
      }
    } catch (error) {
      console.error("Erro ao buscar artigos:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const artigosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return artigos;
    return artigos.filter((artigo) =>
      artigo.titulo.toLowerCase().includes(termo)
    );
  }, [artigos, busca]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <BookOpen className="w-7 h-7 text-military-600 flex-shrink-0" />
            Consulta
          </h1>
          <p className="text-gray-600">
            Regulamentos, ComprasNET e pregões — material de referência para o
            fluxo de plano de trabalho.
          </p>
        </div>
        {user?.role === "SUPER_ADMIN" && (
          <Link href="/dashboard/consulta/novo">
            <Button className="w-full sm:w-auto">
              <Plus className="w-5 h-5 mr-2" />
              Novo Artigo
            </Button>
          </Link>
        )}
      </div>

      <div className="relative mb-4 max-w-md">
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por título..."
          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-military-500 focus:border-transparent text-sm"
        />
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {CATEGORIAS.map((c) => (
          <button
            key={c.value}
            onClick={() => setCategoriaFiltro(c.value)}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              categoriaFiltro === c.value
                ? "bg-military-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-military-600"></div>
        </div>
      ) : artigosFiltrados.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-gray-600">
            {artigos.length === 0
              ? "Nenhum artigo cadastrado ainda."
              : `Nenhum artigo encontrado para "${busca}".`}
          </p>
        </div>
      ) : (
        <>
          {/* Mobile: card list */}
          <div className="sm:hidden space-y-3">
            {artigosFiltrados.map((artigo) => (
              <Link
                key={artigo.id}
                href={`/dashboard/consulta/${artigo.id}`}
                className="block bg-white rounded-lg border border-gray-200 p-4 hover:bg-gray-50"
              >
                <div className="font-medium text-gray-900 break-words mb-1">
                  {artigo.titulo}
                </div>
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>
                    {CATEGORIAS.find((c) => c.value === artigo.categoria)?.label ||
                      artigo.categoria}
                  </span>
                  <span>{new Date(artigo.updatedAt).toLocaleDateString("pt-BR")}</span>
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  {artigo.autor.postoGraduacao}{" "}
                  {artigo.autor.nomeGuerra || artigo.autor.nomeCompleto}
                </div>
              </Link>
            ))}
          </div>

          {/* Desktop/tablet: table */}
          <div className="hidden sm:block bg-white rounded-lg border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left p-3 font-medium text-gray-700">Título</th>
                <th className="text-left p-3 font-medium text-gray-700">Categoria</th>
                <th className="text-left p-3 font-medium text-gray-700">Autor</th>
                <th className="text-left p-3 font-medium text-gray-700">Atualizado</th>
              </tr>
            </thead>
            <tbody>
              {artigosFiltrados.map((artigo) => (
                <tr
                  key={artigo.id}
                  className="border-b border-gray-100 last:border-0 hover:bg-gray-50"
                >
                  <td className="p-3">
                    <Link
                      href={`/dashboard/consulta/${artigo.id}`}
                      className="font-medium text-gray-900 hover:underline"
                    >
                      {artigo.titulo}
                    </Link>
                  </td>
                  <td className="p-3 text-gray-600">
                    {CATEGORIAS.find((c) => c.value === artigo.categoria)?.label ||
                      artigo.categoria}
                  </td>
                  <td className="p-3 text-gray-600">
                    {artigo.autor.postoGraduacao}{" "}
                    {artigo.autor.nomeGuerra || artigo.autor.nomeCompleto}
                  </td>
                  <td className="p-3 text-gray-600">
                    {new Date(artigo.updatedAt).toLocaleDateString("pt-BR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </>
      )}
    </div>
  );
}
