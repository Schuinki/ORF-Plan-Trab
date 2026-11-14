'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Operacao {
  id: string;
  nome: string;
  efetivoMil: number;
  efetivoExt?: number;
  dataInicio: string;
  dataFinal: string;
  status: string;
  om: {
    nome: string;
    sigla: string;
  };
  omsParticipantes: Array<{ id: string }>;
  planosTrabalho: Array<{ id: string; titulo: string; status: string }>;
}

export default function OperacoesPage() {
  const [operacoes, setOperacoes] = useState<Operacao[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busca, setBusca] = useState('');

  useEffect(() => {
    fetchOperacoes();
  }, []);

  const fetchOperacoes = async () => {
    try {
      const response = await fetch('/api/operacoes');
      const data = await response.json();
      setOperacoes(data);
    } catch (error) {
      console.error('Error fetching operacoes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const operacoesFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return operacoes;
    return operacoes.filter(
      (op) =>
        op.nome.toLowerCase().includes(termo) ||
        op.om.sigla.toLowerCase().includes(termo) ||
        op.om.nome.toLowerCase().includes(termo)
    );
  }, [operacoes, busca]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Operações</h1>
          <p className="text-gray-600">Gerenciar operações militares</p>
        </div>
        <Link href="/dashboard/operacoes/nova" className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto">
            <Plus className="w-5 h-5 mr-2" />
            Nova Operação
          </Button>
        </Link>
      </div>

      {operacoes.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma operação cadastrada</h3>
          <p className="text-gray-600 mb-6">Comece criando uma nova operação</p>
          <Link href="/dashboard/operacoes/nova">
            <Button>
              <Plus className="w-5 h-5 mr-2" />
              Nova Operação
            </Button>
          </Link>
        </div>
      ) : (
        <>
          <div className="relative mb-4 max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome da operação ou OM..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-military-500 focus:border-transparent text-sm"
            />
          </div>

          {operacoesFiltradas.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <p className="text-gray-600">
                Nenhuma operação encontrada para &quot;{busca}&quot;
              </p>
            </div>
          ) : (
        <>
          {/* Mobile: card list */}
          <div className="sm:hidden space-y-3">
            {operacoesFiltradas.map((operacao) => (
              <Link
                key={operacao.id}
                href={`/dashboard/operacoes/${operacao.id}`}
                className="block bg-white rounded-lg border border-gray-200 p-4 hover:bg-gray-50"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="font-medium text-gray-900 break-words">{operacao.nome}</span>
                </div>
                <div className="grid grid-cols-2 gap-1 text-sm text-gray-600">
                  <div>OM: {operacao.om.sigla}</div>
                  <div className="text-right">
                    Efetivo: {operacao.efetivoMil}
                    {operacao.efetivoExt ? ` + ${operacao.efetivoExt}` : ''}
                  </div>
                  <div className="col-span-2 whitespace-nowrap">
                    {format(new Date(operacao.dataInicio), 'dd MMM', { locale: ptBR })} –{' '}
                    {format(new Date(operacao.dataFinal), 'dd MMM yyyy', { locale: ptBR })}
                  </div>
                  <div>OMs: {operacao.omsParticipantes.length}</div>
                  <div className="text-right">Planos: {operacao.planosTrabalho.length}</div>
                </div>
              </Link>
            ))}
          </div>

          {/* Desktop/tablet: table */}
          <div className="hidden sm:block bg-white rounded-lg border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left p-3 font-medium text-gray-700">Nome</th>
                <th className="text-left p-3 font-medium text-gray-700">OM</th>
                <th className="text-left p-3 font-medium text-gray-700">Período</th>
                <th className="text-right p-3 font-medium text-gray-700">Efetivo</th>
                <th className="text-right p-3 font-medium text-gray-700">OMs Participantes</th>
                <th className="text-right p-3 font-medium text-gray-700">Planos</th>
                <th className="text-right p-3 font-medium text-gray-700"></th>
              </tr>
            </thead>
            <tbody>
              {operacoesFiltradas.map((operacao) => (
                <tr
                  key={operacao.id}
                  className="border-b border-gray-100 last:border-0 hover:bg-gray-50"
                >
                  <td className="p-3">
                    <Link
                      href={`/dashboard/operacoes/${operacao.id}`}
                      className="font-medium text-gray-900 hover:underline hover:text-military-700"
                    >
                      {operacao.nome}
                    </Link>
                  </td>
                  <td className="p-3 text-gray-600">{operacao.om.sigla}</td>
                  <td className="p-3 text-gray-600 whitespace-nowrap">
                    {format(new Date(operacao.dataInicio), 'dd MMM', { locale: ptBR })} –{' '}
                    {format(new Date(operacao.dataFinal), 'dd MMM yyyy', { locale: ptBR })}
                  </td>
                  <td className="p-3 text-right text-gray-600">
                    {operacao.efetivoMil}
                    {operacao.efetivoExt ? ` + ${operacao.efetivoExt}` : ''}
                  </td>
                  <td className="p-3 text-right text-gray-600">
                    {operacao.omsParticipantes.length}
                  </td>
                  <td className="p-3 text-right text-gray-600">
                    {operacao.planosTrabalho.length}
                  </td>
                  <td className="p-3 text-right">
                    <Link href={`/dashboard/operacoes/${operacao.id}`}>
                      <Button variant="outline" size="sm">
                        Acessar
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </>
          )}
        </>
      )}
    </div>
  );
}
