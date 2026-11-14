"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useSession } from "@/hooks/useSession";

interface Artigo {
  id: string;
  titulo: string;
  categoria: string;
  conteudo: string;
  updatedAt: string;
  autor: { nomeCompleto: string; nomeGuerra: string | null; postoGraduacao: string };
}

const CATEGORIA_LABELS: Record<string, string> = {
  PREGAO: "Pregões",
  COMPRASNET: "ComprasNET",
  REGULAMENTO: "Regulamentos",
  OUTRO: "Outro",
};

export default function ConsultaDetalhePage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useSession();
  const id = params?.id as string;

  const [artigo, setArtigo] = useState<Artigo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (id) fetchArtigo();
  }, [id]);

  const fetchArtigo = async () => {
    try {
      const response = await fetch(`/api/consulta/${id}`);
      if (response.ok) {
        setArtigo(await response.json());
      }
    } catch (error) {
      console.error("Erro ao buscar artigo:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Tem certeza que deseja excluir este artigo?")) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/consulta/${id}`, { method: "DELETE" });
      if (response.ok) {
        router.push("/dashboard/consulta");
      } else {
        const error = await response.json();
        alert(error.error || "Erro ao excluir artigo");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-military-600"></div>
      </div>
    );
  }

  if (!artigo) {
    return <div>Artigo não encontrado</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/dashboard/consulta"
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para Consulta
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 break-words">{artigo.titulo}</h1>
            <p className="text-gray-600 mt-1">
              {CATEGORIA_LABELS[artigo.categoria] || artigo.categoria} ·{" "}
              {artigo.autor.postoGraduacao}{" "}
              {artigo.autor.nomeGuerra || artigo.autor.nomeCompleto} ·{" "}
              {new Date(artigo.updatedAt).toLocaleDateString("pt-BR")}
            </p>
          </div>
          {user?.role === "SUPER_ADMIN" && (
            <div className="flex flex-wrap gap-2">
              <Link href={`/dashboard/consulta/${id}/editar`}>
                <Button variant="outline">
                  <Pencil className="w-4 h-4 mr-2" />
                  Editar
                </Button>
              </Link>
              <Button variant="danger" onClick={handleDelete} isLoading={isDeleting}>
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 prose prose-sm max-w-none overflow-x-auto">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{artigo.conteudo}</ReactMarkdown>
      </div>
    </div>
  );
}
