import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { TipoOM } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const organizacoes = await prisma.organizacaoMilitar.findMany({
      select: {
        id: true,
        nome: true,
        sigla: true,
        tipo: true,
        codUG: true,
      },
      orderBy: {
        nome: 'asc',
      },
    });

    return NextResponse.json(organizacoes);
  } catch (error) {
    console.error('Get organizacoes error:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

const criarOrganizacaoSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  sigla: z.string().min(1, 'Sigla é obrigatória'),
  tipo: z.nativeEnum(TipoOM),
  codUG: z.string().min(1).nullable().optional(),
  omPaiId: z.string().min(1).nullable().optional(),
});

/**
 * POST /api/organizacoes
 * Cadastra uma nova Organização Militar — inclusive OMs de fora da
 * hierarquia da CMA (ex.: COTER, CIE) que ainda não existam no sistema.
 * Restrito a SUPER_ADMIN, pois esses dados (CODUG, hierarquia) afetam
 * todas as operações e planos de trabalho.
 */
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: currentUser.userId },
    });
    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }
    if (user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Apenas o Super Admin pode cadastrar novas OMs' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = criarOrganizacaoSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { nome, sigla, tipo, codUG, omPaiId } = validation.data;

    if (codUG) {
      const existente = await prisma.organizacaoMilitar.findUnique({
        where: { codUG },
      });
      if (existente) {
        return NextResponse.json(
          { error: 'Já existe uma OM cadastrada com este CODUG' },
          { status: 400 }
        );
      }
    }

    if (omPaiId) {
      const paiExiste = await prisma.organizacaoMilitar.findUnique({
        where: { id: omPaiId },
        select: { id: true },
      });
      if (!paiExiste) {
        return NextResponse.json({ error: 'OM pai não encontrada' }, { status: 404 });
      }
    }

    const novaOm = await prisma.organizacaoMilitar.create({
      data: {
        nome,
        sigla,
        tipo,
        codUG: codUG || null,
        omPaiId: omPaiId || null,
      },
      select: {
        id: true,
        nome: true,
        sigla: true,
        tipo: true,
        codUG: true,
      },
    });

    return NextResponse.json(novaOm, { status: 201 });
  } catch (error) {
    console.error('Create organizacao error:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
