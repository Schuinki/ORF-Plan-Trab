"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { ArtigoForm } from "@/components/consulta/ArtigoForm";

interface Artigo {
  id: string;
  titulo: string;
  categoria: string;
  conteudo: string;
}

export default function EditarArtigoPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading: isLoadingUser } = useSession();
  const id = params?.id as string;

  const [artigo, setArtigo] = useState<Artigo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isLoadingUser && user && user.role !== "SUPER_ADMIN") {
      router.replace(`/dashboard/consulta/${id}`);
    }
  }, [isLoadingUser, user, router, id]);

  useEffect(() => {
    if (id) fetchArtigo();
  }, [id]);

  const fetchArtigo = async () => {
    try {
      const response = await fetch(`/api/consulta/${id}`);
      if (response.ok) {
        setArtigo(await response.json());
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingUser || isLoading || !user || user.role !== "SUPER_ADMIN" || !artigo) {
    return null;
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href={`/dashboard/consulta/${id}`}
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para o Artigo
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Editar Artigo</h1>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
        <ArtigoForm artigoId={id} valoresIniciais={artigo} />
      </div>
    </div>
  );
}
