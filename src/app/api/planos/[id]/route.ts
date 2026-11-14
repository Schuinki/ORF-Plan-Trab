import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import {
  getApprovalChain,
  formatApprovalChainForDisplay,
  canUserApprove,
} from '@/lib/approval-chain';

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

    // Verificar se deve incluir despesas completas (para PDF)
    const { searchParams } = new URL(request.url);
    const incluirDespesas = searchParams.get('incluirDespesas') === 'true';

    const plano = await prisma.planoTrabalho.findUnique({
      where: { id },
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
        operacao: {
          select: {
            id: true,
            nome: true,
            efetivoMil: true,
            efetivoExt: true,
            dataInicio: true,
            dataFinal: true,
            diasTotais: true,
            finalidade: true,
            motivacao: true,
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
        despesas: incluirDespesas ? {
          include: {
            classe: {
              select: {
                nome: true,
                descricao: true,
              },
            },
            tipo: {
              select: {
                nome: true,
                isCombustivel: true,
              },
            },
            oms: {
              include: {
                omDestino: {
                  select: {
                    id: true,
                    nome: true,
                    sigla: true,
                    codUG: true,
                  },
                },
                omCompradora: {
                  select: {
                    id: true,
                    nome: true,
                    sigla: true,
                    codUG: true,
                  },
                },
              },
            },
            despesasNaturezas: {
              include: {
                natureza: {
                  select: {
                    id: true,
                    codigo: true,
                    nome: true,
                    descricao: true,
                  },
                },
              },
            },
          },
        } : {
          select: {
            id: true,
            valorCalculado: true,
          },
        },
        despesasOperacionais: incluirDespesas ? {
          include: {
            omDestino: {
              select: {
                id: true,
                nome: true,
                sigla: true,
                codUG: true,
              },
            },
            omCompradora: {
              select: {
                id: true,
                nome: true,
                sigla: true,
                codUG: true,
              },
            },
            naturezas: {
              include: {
                natureza: {
                  select: {
                    id: true,
                    codigo: true,
                    nome: true,
                    gnd: true,
                  },
                },
              },
            },
          },
        } : false,
        itensRacaoR2: incluirDespesas
          ? {
              include: {
                om: { select: { id: true, nome: true, sigla: true, codUG: true } },
              },
              orderBy: [{ om: { sigla: "asc" } }, { createdAt: "asc" }],
            }
          : false,
        itensMunicao: incluirDespesas
          ? {
              include: {
                om: { select: { id: true, nome: true, sigla: true, codUG: true } },
              },
              orderBy: [{ om: { sigla: "asc" } }, { createdAt: "asc" }],
            }
          : false,
        _count: {
          select: {
            despesas: true,
            despesasOperacionais: true,
            documentosReferencia: true,
            anotacoes: true,
          },
        },
      },
    });

    if (!plano) {
      return NextResponse.json(
        { error: 'Plano não encontrado' },
        { status: 404 }
      );
    }

    // Cadeia de aprovação dinâmica (hierarquia de OMs) + permissão do usuário no nível atual
    const chain = await getApprovalChain(plano.omId);
    const cadeiaAprovacao = formatApprovalChainForDisplay(
      chain,
      plano.nivelAprovacaoAtual
    );
    const podeAprovarNivelAtual =
      plano.status === 'EM_ANALISE' && plano.nivelAprovacaoAtual
        ? await canUserApprove(
            currentUser.userId,
            plano.omId,
            plano.nivelAprovacaoAtual
          )
        : false;

    return NextResponse.json({
      ...plano,
      cadeiaAprovacao,
      podeAprovarNivelAtual,
    });
  } catch (error) {
    console.error('Get plano error:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
