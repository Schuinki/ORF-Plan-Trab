import { prisma } from "@/lib/prisma";
import { OrganizacaoMilitar } from "@prisma/client";

/**
 * Verifica se uma OM é "folha" (não tem subordinadas).
 * Apenas OMs folha podem preencher planos de trabalho.
 */
export async function isOmFolha(omId: string): Promise<boolean> {
  const om = await prisma.organizacaoMilitar.findUnique({
    where: { id: omId },
    include: {
      omsFilhas: {
        select: { id: true },
        take: 1,
      },
    },
  });

  if (!om) return false;

  return om.omsFilhas.length === 0;
}

/**
 * Verifica se uma OM está subordinada (direta ou indiretamente) a uma OM participante da operação.
 * Sobe a hierarquia até encontrar uma participante ou chegar ao topo.
 */
export async function isSubordinadaDeParticipante(
  omId: string,
  omsParticipantesIds: string[]
): Promise<boolean> {
  let currentOmId: string | null = omId;

  while (currentOmId) {
    if (omsParticipantesIds.includes(currentOmId)) {
      return true;
    }

    const omAtual: { omPaiId: string | null } | null =
      await prisma.organizacaoMilitar.findUnique({
        where: { id: currentOmId },
        select: { omPaiId: true },
      });

    currentOmId = omAtual?.omPaiId ?? null;
  }

  return false;
}

/**
 * Retorna as OMs subordinadas diretas de uma OM.
 */
export async function getOmsSubordinadasDiretas(
  omId: string
): Promise<OrganizacaoMilitar[]> {
  return prisma.organizacaoMilitar.findMany({
    where: { omPaiId: omId },
    orderBy: { sigla: "asc" },
  });
}

/**
 * Retorna todas as OMs subordinadas (recursivamente) de uma OM.
 */
export async function getTodasOmsSubordinadas(
  omId: string
): Promise<OrganizacaoMilitar[]> {
  const result: OrganizacaoMilitar[] = [];

  async function fetchSubordinadas(parentId: string) {
    const subordinadas = await prisma.organizacaoMilitar.findMany({
      where: { omPaiId: parentId },
    });

    for (const om of subordinadas) {
      result.push(om);
      await fetchSubordinadas(om.id);
    }
  }

  await fetchSubordinadas(omId);
  return result;
}
