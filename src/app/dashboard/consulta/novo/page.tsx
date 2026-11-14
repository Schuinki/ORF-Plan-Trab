"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { ArtigoForm } from "@/components/consulta/ArtigoForm";

export default function NovoArtigoPage() {
  const router = useRouter();
  const { user, isLoading } = useSession();

  useEffect(() => {
    if (!isLoading && user && user.role !== "SUPER_ADMIN") {
      router.replace("/dashboard/consulta");
    }
  }, [isLoading, user, router]);

  if (isLoading || !user || user.role !== "SUPER_ADMIN") {
    return null;
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
        <h1 className="text-3xl font-bold text-gray-900">Novo Artigo</h1>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
        <ArtigoForm />
      </div>
    </div>
  );
}
