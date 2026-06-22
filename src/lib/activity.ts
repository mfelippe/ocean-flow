import type { ActivityType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** Registra um evento no feed de atividade de um quadro/card. */
export async function logActivity(params: {
  boardId: string;
  cardId?: string | null;
  actorId?: string | null;
  type: ActivityType;
  payload?: Prisma.InputJsonValue;
}): Promise<void> {
  await prisma.activity.create({
    data: {
      boardId: params.boardId,
      cardId: params.cardId ?? null,
      actorId: params.actorId ?? null,
      type: params.type,
      payload: params.payload,
    },
  });
}
