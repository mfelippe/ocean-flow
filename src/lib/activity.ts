import { after } from "next/server";
import type { ActivityType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { dispatchWebhooks } from "@/lib/webhooks";

/** Registra um evento no feed de atividade e notifica os webhooks da org. */
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

  // Entrega dos webhooks após a resposta, sem atrasar a ação do usuário.
  after(() =>
    dispatchWebhooks(params.boardId, params.type, {
      cardId: params.cardId,
      actorId: params.actorId,
      data: params.payload,
    }),
  );
}
