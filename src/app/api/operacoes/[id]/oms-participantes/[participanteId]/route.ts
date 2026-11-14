import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { TipoEvento } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { canDefineParticipants } from '@/lib/permissions';

const patchHierarquiaSchema = z.object({
  omPaiOverrideId: z.string().nullable(),
});

/**
 * PATCH /api/operacoes/[id]/oms-participantes/[participanteId]
 * Define/remove a hierarquia (quem é "pai" de quem) entre OMs
 * participantes, apenas no âmbito desta operação — não altera a
 * hierarquia global (OrganizacaoMilitar.omPaiId).
 * Body: { omPaiOverrideId: string | null }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; participanteId: string }> }
) {
  try {
    const { id, participanteId } = await params;
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
      include: { omsParticipantes: { include: { om: { select: { sigla: true } } } } },
    });

    if (!operacao) {
      return NextResponse.json({ error: 'Operação não encontrada' }, { status: 404 });
    }

    if (!canDefineParticipants(user.omId, operacao.omId, user.role)) {
      return NextResponse.json(
        { error: 'Sem permissão para editar a hierarquia desta operação' },
        { status: 403 }
      );
    }

    const participante = operacao.omsParticipantes.find((p) => p.id === participanteId);
    if (!participante) {
      return NextResponse.json(
        { error: 'Participante não encontrado nesta operação' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validation = patchHierarquiaSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { omPaiOverrideId } = validation.data;

    if (omPaiOverrideId !== null) {
      const paiCandidato = operacao.omsParticipantes.find(
        (p) => p.omId === omPaiOverrideId
      );
      if (!paiCandidato) {
        return NextResponse.json(
          { error: 'A OM selecionada como superior não participa desta operação' },
          { status: 400 }
        );
      }
      if (paiCandidato.omId === participante.omId) {
        return NextResponse.json(
          { error: 'Uma OM não pode ser superior de si mesma' },
          { status: 400 }
        );
      }

      // Detecta ciclo: sobe a cadeia de override a partir do candidato a pai;
      // se encontrarmos a própria OM do participante, criaria um ciclo.
      const overrideByOmId = new Map(
        operacao.omsParticipantes.map((p) => [p.omId, p.omPaiOverrideId])
      );
      let atualId: string | null = paiCandidato.omId;
      const visitados = new Set<string>();
      while (atualId) {
        if (atualId === participante.omId) {
          return NextResponse.json(
            { error: 'Essa alteração criaria um ciclo na hierarquia da operação' },
            { status: 400 }
          );
        }
        if (visitados.has(atualId)) break;
        visitados.add(atualId);
        atualId = overrideByOmId.get(atualId) ?? null;
      }
    }

    const atualizado = await prisma.operacaoOM.update({
      where: { id: participanteId },
      data: { omPaiOverrideId },
      include: { om: { select: { id: true, nome: true, sigla: true, tipo: true } } },
    });

    await prisma.auditoriaLog.create({
      data: {
        tipoEvento: TipoEvento.EDICAO,
        descricao: omPaiOverrideId
          ? `Hierarquia da operação "${operacao.nome}" alterada: "${atualizado.om.sigla}" passou a ficar sob "${operacao.omsParticipantes.find((p) => p.omId === omPaiOverrideId)?.om.sigla}"`
          : `Hierarquia da operação "${operacao.nome}" alterada: "${atualizado.om.sigla}" voltou ao nível padrão`,
        usuarioId: user.id,
        operacaoId: id,
      },
    });

    return NextResponse.json(atualizado);
  } catch (error) {
    console.error('Patch hierarquia participante error:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
