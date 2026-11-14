"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { LogOut, LayoutDashboard, Folder, Users, BookOpen, Menu, X } from "lucide-react";

interface User {
  id: string;
  nomeCompleto: string;
  nomeGuerra?: string;
  postoGraduacao: string;
  role: string;
  om: {
    nome: string;
    sigla: string;
  };
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    fetchUser();
  }, []);

  // Fecha a gaveta ao navegar (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const fetchUser = async () => {
    try {
      const response = await fetch("/api/auth/me");

      if (!response.ok) {
        router.push("/login");
        return;
      }

      const data = await response.json();
      setUser(data);
    } catch (error) {
      console.error("Error fetching user:", error);
      router.push("/login");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Operações", href: "/dashboard/operacoes", icon: Folder },
    { name: "Consulta", href: "/dashboard/consulta", icon: BookOpen },
  ];

  if (user.role === "SUPER_ADMIN") {
    navigation.push({
      name: "Usuários",
      href: "/dashboard/usuarios",
      icon: Users,
    });
  }

  return (
    <div className="min-h-screen bg-military-50">
      {/* Topbar mobile */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-military-800 bg-military-950 fixed inset-x-0 top-0 z-30 lg:hidden">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-military-600 rounded flex items-center justify-center">
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <h1 className="text-lg font-bold text-military-50">SisPTrab</h1>
        </div>
        <button
          onClick={() => setSidebarOpen(true)}
          aria-label="Abrir menu"
          className="p-2 -mr-2 text-military-100 hover:bg-military-800 rounded-lg"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Backdrop (mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 w-64 bg-military-900 border-r border-military-800 z-50 transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo/Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-military-800 bg-military-950">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-military-600 rounded flex items-center justify-center">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-military-50">SisPTrab</h1>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            aria-label="Fechar menu"
            className="p-2 -mr-2 text-military-200 hover:bg-military-800 rounded-lg lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Info */}
        <div className="p-4 border-b border-military-800 bg-military-900/50">
          <div className="font-medium text-military-50 break-words">
            {user.postoGraduacao} {user.nomeGuerra || user.nomeCompleto}
          </div>
          <div className="text-sm text-military-300">{user.om.sigla}</div>
          <div className="text-xs text-military-400 mt-1">
            {user.role.replace("_", " ")}
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center px-4 py-2.5 rounded-lg transition-colors ${
                  isActive
                    ? "bg-military-600 text-white font-medium"
                    : "text-military-200 hover:bg-military-800"
                }`}
              >
                <Icon className="w-5 h-5 mr-3" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-military-800">
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-2.5 text-red-300 hover:bg-red-900/30 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Sair
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="pt-16 lg:pt-0 lg:pl-64">
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
