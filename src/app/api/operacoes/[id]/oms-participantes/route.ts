import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { TipoEvento } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { canDefineParticipants } from '@/lib/permissions';

const addOmParticipanteSchema = z.object({
  omId: z.string().min(1, 'ID da OM é obrigatório'),
  valorLimite: z.number().positive('Valor limite deve ser positivo'),
});

/**
 * POST /api/operacoes/[id]/oms-participantes
 * Adiciona uma nova OM participante a uma operação já existente.
 * Body: { omId, valorLimite }
 */
export async function POST(
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

    const operacao = await prisma.operacao.findUnique({
      where: { id },
      include: { omsParticipantes: true },
    });

    if (!operacao) {
      return NextResponse.json(
        { error: 'Operação não encontrada' },
        { status: 404 }
      );
    }

    if (!canDefineParticipants(user.omId, operacao.omId, user.role)) {
      return NextResponse.json(
        { error: 'Sem permissão para adicionar OMs participantes nesta operação' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = addOmParticipanteSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { omId, valorLimite } = validation.data;

    if (operacao.omsParticipantes.some((p) => p.omId === omId)) {
      return NextResponse.json(
        { error: 'Esta OM já é participante desta operação' },
        { status: 400 }
      );
    }

    const omExiste = await prisma.organizacaoMilitar.findUnique({
      where: { id: omId },
      select: { id: true },
    });
    if (!omExiste) {
      return NextResponse.json({ error: 'OM não encontrada' }, { status: 404 });
    }

    if (operacao.valorLimiteTotal) {
      const somaAtual = operacao.omsParticipantes.reduce(
        (acc, p) => acc + Number(p.valorLimite),
        0
      );
      const novoTotal = somaAtual + valorLimite;
      if (novoTotal > Number(operacao.valorLimiteTotal)) {
        return NextResponse.json(
          {
            error: 'A soma dos valores das OMs participantes excederia o valor limite total',
            details: {
              valorLimiteTotal: Number(operacao.valorLimiteTotal),
              somaAtual,
              valorSolicitado: valorLimite,
            },
          },
          { status: 400 }
        );
      }
    }

    const novoParticipante = await prisma.operacaoOM.create({
      data: {
        operacaoId: id,
        omId,
        valorLimite,
      },
      include: {
        om: {
          select: {
            id: true,
            nome: true,
            sigla: true,
            tipo: true,
          },
        },
      },
    });

    await prisma.auditoriaLog.create({
      data: {
        tipoEvento: TipoEvento.EDICAO,
        descricao: `OM "${novoParticipante.om.sigla}" adicionada como participante da operação "${operacao.nome}"`,
        usuarioId: user.id,
        operacaoId: id,
        metadados: {
          omAdicionada: {
            id: novoParticipante.om.id,
            sigla: novoParticipante.om.sigla,
            valorLimite,
          },
        },
      },
    });

    return NextResponse.json(novoParticipante, { status: 201 });
  } catch (error) {
    console.error('Add OM participante error:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
