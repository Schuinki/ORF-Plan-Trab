import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { TipoEvento } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { canDefineParticipants } from '@/lib/permissions';

const updateOperacaoSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').optional(),
  efetivoMil: z.number().int().positive('Efetivo deve ser positivo').optional(),
  efetivoExt: z
    .number()
    .int()
    .positive('Efetivo deve ser positivo')
    .nullable()
    .optional(),
  dataInicio: z.string().datetime().optional(),
  dataFinal: z.string().datetime().optional(),
  finalidade: z.string().nullable().optional(),
  motivacao: z.string().nullable().optional(),
  consequenciaNaoAtendimento: z.string().nullable().optional(),
  observacoes: z.string().nullable().optional(),
  valorLimiteTotal: z
    .number()
    .positive('Valor limite total deve ser positivo')
    .nullable()
    .optional(),
  // Dados usados na geração da DOR (Documento de Oficialização da Requisição)
  orgaoRequisitante: z.string().nullable().optional(),
  responsavelDemanda: z.string().nullable().optional(),
  emailResponsavel: z.string().email('E-mail inválido').nullable().optional(),
  telefoneResponsavel: z.string().nullable().optional(),
  dorNumero: z.string().nullable().optional(),
  dorData: z.string().datetime().nullable().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const operacao = await prisma.operacao.findUnique({
      where: { id },
      include: {
        om: {
          select: {
            id: true,
            nome: true,
            sigla: true,
            tipo: true,
          },
        },
        omsParticipantes: {
          include: {
            om: {
              select: {
                id: true,
                nome: true,
                sigla: true,
                tipo: true,
                codUG: true,
              },
            },
          },
        },
        planosTrabalho: {
          include: {
            om: {
              select: {
                id: true,
                nome: true,
                sigla: true,
              },
            },
            responsavel: {
              select: {
                id: true,
                nomeCompleto: true,
                nomeGuerra: true,
                postoGraduacao: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!operacao) {
      return NextResponse.json(
        { error: 'Operação não encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json(operacao);
  } catch (error) {
    console.error('Get operacao error:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/operacoes/[id]
 * Edita os dados básicos de uma operação já existente (nome, efetivo,
 * datas, valor limite total, campos descritivos). Para adicionar OMs
 * participantes, use POST /api/operacoes/[id]/oms-participantes.
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
        { error: 'Sem permissão para editar esta operação' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = updateOperacaoSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: validation.error.errors },
        { status: 400 }
      );
    }

    const data = validation.data;

    const dataInicio = data.dataInicio
      ? new Date(data.dataInicio)
      : operacao.dataInicio;
    const dataFinal = data.dataFinal
      ? new Date(data.dataFinal)
      : operacao.dataFinal;
    const diasTotais =
      data.dataInicio || data.dataFinal
        ? Math.ceil(
            (dataFinal.getTime() - dataInicio.getTime()) /
              (1000 * 60 * 60 * 24)
          ) + 1
        : operacao.diasTotais;

    const novoValorLimiteTotal =
      data.valorLimiteTotal !== undefined
        ? data.valorLimiteTotal
        : operacao.valorLimiteTotal;

    if (novoValorLimiteTotal !== null && novoValorLimiteTotal !== undefined) {
      const somaOms = operacao.omsParticipantes.reduce(
        (acc, p) => acc + Number(p.valorLimite),
        0
      );
      if (somaOms > Number(novoValorLimiteTotal)) {
        return NextResponse.json(
          {
            error:
              'O novo valor limite total é menor que a soma já alocada entre as OMs participantes',
            details: {
              valorLimiteTotal: Number(novoValorLimiteTotal),
              somaAlocadaOms: somaOms,
            },
          },
          { status: 400 }
        );
      }
    }

    const operacaoAtualizada = await prisma.operacao.update({
      where: { id },
      data: {
        ...(data.nome !== undefined && { nome: data.nome }),
        ...(data.efetivoMil !== undefined && { efetivoMil: data.efetivoMil }),
        ...(data.efetivoExt !== undefined && { efetivoExt: data.efetivoExt }),
        ...(data.dataInicio !== undefined && { dataInicio }),
        ...(data.dataFinal !== undefined && { dataFinal }),
        ...((data.dataInicio || data.dataFinal) && { diasTotais }),
        ...(data.finalidade !== undefined && { finalidade: data.finalidade }),
        ...(data.motivacao !== undefined && { motivacao: data.motivacao }),
        ...(data.consequenciaNaoAtendimento !== undefined && {
          consequenciaNaoAtendimento: data.consequenciaNaoAtendimento,
        }),
        ...(data.observacoes !== undefined && {
          observacoes: data.observacoes,
        }),
        ...(data.valorLimiteTotal !== undefined && {
          valorLimiteTotal: data.valorLimiteTotal,
        }),
        ...(data.orgaoRequisitante !== undefined && {
          orgaoRequisitante: data.orgaoRequisitante,
        }),
        ...(data.responsavelDemanda !== undefined && {
          responsavelDemanda: data.responsavelDemanda,
        }),
        ...(data.emailResponsavel !== undefined && {
          emailResponsavel: data.emailResponsavel,
        }),
        ...(data.telefoneResponsavel !== undefined && {
          telefoneResponsavel: data.telefoneResponsavel,
        }),
        ...(data.dorNumero !== undefined && { dorNumero: data.dorNumero }),
        ...(data.dorData !== undefined && {
          dorData: data.dorData ? new Date(data.dorData) : null,
        }),
      },
      include: {
        om: {
          select: { id: true, nome: true, sigla: true, tipo: true },
        },
        omsParticipantes: {
          include: {
            om: {
              select: { id: true, nome: true, sigla: true, tipo: true },
            },
          },
        },
      },
    });

    await prisma.auditoriaLog.create({
      data: {
        tipoEvento: TipoEvento.EDICAO,
        descricao: `Operação "${operacaoAtualizada.nome}" editada`,
        usuarioId: user.id,
        operacaoId: id,
        metadados: { camposAlterados: Object.keys(data) },
      },
    });

    return NextResponse.json(operacaoAtualizada);
  } catch (error) {
    console.error('Update operacao error:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Check if operation exists
    const operacao = await prisma.operacao.findUnique({
      where: { id },
    });

    if (!operacao) {
      return NextResponse.json(
        { error: 'Operação não encontrada' },
        { status: 404 }
      );
    }

    // Delete the operation (cascade delete will handle related records)
    await prisma.operacao.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Operação excluída com sucesso' });
  } catch (error) {
    console.error('Delete operacao error:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
