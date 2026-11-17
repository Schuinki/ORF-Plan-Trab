import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

const atualizarOrganizacaoSchema = z.object({
  omPaiId: z.string().min(1).nullable(),
});

/**
 * PATCH /api/organizacoes/[id]
 * Altera a OM pai de uma Organização Militar na hierarquia cadastral global
 * (a mesma usada pela cadeia de aprovação em todo o sistema). Restrito a
 * SUPER_ADMIN. Bloqueia ciclos (uma OM não pode virar ancestral de si mesma).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
        { error: 'Apenas o Super Admin pode alterar a hierarquia' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = atualizarOrganizacaoSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { omPaiId } = validation.data;

    const om = await prisma.organizacaoMilitar.findUnique({ where: { id } });
    if (!om) {
      return NextResponse.json({ error: 'OM não encontrada' }, { status: 404 });
    }

    if (omPaiId) {
      if (omPaiId === id) {
        return NextResponse.json(
          { error: 'Uma OM não pode ser pai dela mesma' },
          { status: 400 }
        );
      }

      const novoPai = await prisma.organizacaoMilitar.findUnique({
        where: { id: omPaiId },
        select: { id: true, omPaiId: true },
      });
      if (!novoPai) {
        return NextResponse.json({ error: 'OM pai não encontrada' }, { status: 404 });
      }

      // Bloquear ciclo: subir a cadeia a partir do novo pai e garantir que a
      // própria OM (id) não apareça como um dos ancestrais dele. A checagem
      // de "já visitado" é só para não entrar em loop infinito se já existir
      // um ciclo antigo por outro motivo — tem que vir DEPOIS da checagem de
      // id, senão nunca dispara (visitados nunca continha `id`).
      let cursor: string | null = novoPai.omPaiId;
      const visitados = new Set<string>();
      while (cursor) {
        if (cursor === id) {
          return NextResponse.json(
            {
              error:
                'Essa alteração criaria um ciclo na hierarquia (a OM pai escolhida é subordinada desta OM).',
            },
            { status: 400 }
          );
        }
        if (visitados.has(cursor)) break; // ciclo pré-existente, não insiste
        visitados.add(cursor);
        const ancestral: { omPaiId: string | null } | null =
          await prisma.organizacaoMilitar.findUnique({
            where: { id: cursor },
            select: { omPaiId: true },
          });
        cursor = ancestral?.omPaiId ?? null;
      }
    }

    const atualizada = await prisma.organizacaoMilitar.update({
      where: { id },
      data: { omPaiId: omPaiId || null },
      select: {
        id: true,
        nome: true,
        sigla: true,
        tipo: true,
        codUG: true,
        omPaiId: true,
      },
    });

    return NextResponse.json(atualizada);
  } catch (error) {
    console.error('Update organizacao error:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
