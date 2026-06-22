import crypto from "node:crypto";
import type { Webhook } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** Gera um segredo aleatório para assinar os payloads do webhook. */
export function generateWebhookSecret(): string {
  return crypto.randomBytes(24).toString("hex");
}

type DispatchInput = {
  cardId?: string | null;
  actorId?: string | null;
  data?: unknown;
};

/**
 * Notifica os webhooks ativos da organização dona do board sobre um evento.
 * Entrega em paralelo, com timeout, ignorando falhas (não bloqueia o usuário).
 */
export async function dispatchWebhooks(
  boardId: string,
  event: string,
  input: DispatchInput,
): Promise<void> {
  const board = await prisma.board.findUnique({
    where: { id: boardId },
    select: { organizationId: true },
  });
  if (!board) return;

  const allHooks = await prisma.webhook.findMany({
    where: { organizationId: board.organizationId, active: true },
  });
  // events vazio = assina todos; senão, só os eventos listados.
  const hooks = allHooks.filter(
    (h) => h.events.length === 0 || h.events.includes(event),
  );
  if (hooks.length === 0) return;

  const body = JSON.stringify({
    event,
    occurredAt: new Date().toISOString(),
    organizationId: board.organizationId,
    boardId,
    cardId: input.cardId ?? null,
    actorId: input.actorId ?? null,
    data: input.data ?? null,
  });

  await Promise.allSettled(hooks.map((h) => deliver(h, event, body)));
}

async function deliver(
  hook: Webhook,
  event: string,
  body: string,
): Promise<void> {
  const signature = crypto
    .createHmac("sha256", hook.secret)
    .update(body)
    .digest("hex");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    await fetch(hook.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "OceanFlow-Webhook",
        "X-OceanFlow-Event": event,
        "X-OceanFlow-Signature": `sha256=${signature}`,
      },
      body,
      signal: controller.signal,
    });
  } catch {
    // entrega best-effort: ignora timeouts/erros de rede
  } finally {
    clearTimeout(timer);
  }
}
