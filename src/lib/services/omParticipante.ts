import { Prisma, OperacaoOM } from "@prisma/client";

type TxOrClient = Prisma.TransactionClient;

/**
 * Garante que uma OM seja participante de uma operação, criando a linha
 * OperacaoOM automaticamente (com valorLimite = 0) se ainda não existir.
 * Usado quando uma OM destino é escolhida no rateio de uma despesa mas
 * ainda não participa formalmente da operação — em vez de rejeitar a
 * despesa, ela é adicionada como participante com teto zerado, a ser
 * ajustado depois pelo responsável pela operação.
 */
export async function autoAdicionarParticipante(
  tx: TxOrClient,
  operacaoId: string,
  omId: string
): Promise<{ criado: boolean; participante: OperacaoOM }> {
  const existente = await tx.operacaoOM.findUnique({
    where: { operacaoId_omId: { operacaoId, omId } },
  });

  if (existente) {
    return { criado: false, participante: existente };
  }

  const novo = await tx.operacaoOM.create({
    data: { operacaoId, omId, valorLimite: 0 },
  });

  return { criado: true, participante: novo };
}
