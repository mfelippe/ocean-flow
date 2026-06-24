import { after } from "next/server";
import type { ActivityType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { rankBetween } from "@/lib/rank";
import { automationActionSchema } from "@/lib/validations";
import type { AutomationActionInput } from "@/lib/validations";

/**
 * Grava atividade de uma ação de automação. Diferente de `logActivity`, NÃO
 * dispara webhooks: o motor já roda dentro de `after()` (after aninhado falha)
 * e evita loops automação → webhook → API → automação.
 */
async function logAutomationActivity(params: {
  boardId: string;
  cardId: string;
  type: ActivityType;
  payload: Prisma.InputJsonValue;
}): Promise<void> {
  await prisma.activity.create({
    data: {
      boardId: params.boardId,
      cardId: params.cardId,
      type: params.type,
      payload: params.payload,
    },
  });
}

/**
 * Motor de automações (v1). Regras GATILHO → AÇÕES por quadro.
 *
 * Gatilhos suportados:
 *  - CARD_CREATED          (opcionalmente filtrado por coluna)
 *  - CARD_MOVED_TO_COLUMN  (sempre filtrado pela coluna de destino)
 *
 * Ações: MOVE_CARD, ADD_LABEL, REMOVE_LABEL, ADD_COMMENT, HTTP_REQUEST.
 *
 * Anti-loop: as ações executam DIRETO (via prisma), sem reentrar no motor.
 * Ou seja, uma automação nunca dispara outra — sem cascata infinita.
 * A execução roda em `after()` para não atrasar a resposta do usuário.
 */

type Trigger = "CARD_CREATED" | "CARD_MOVED_TO_COLUMN";

type CardContext = {
  id: string;
  title: string;
  description: string;
  url: string;
  organizationId: string; // org do card de origem (limite de tenancy)
  columnId: string;
  columnName: string;
  fields: Record<string, string>; // nome do campo (minúsculo) → valor
};

/**
 * Dispara as automações de um quadro para um gatilho/coluna. Não lança:
 * roda em segundo plano e engole erros por ação (best-effort).
 */
export function runAutomations(params: {
  boardId: string;
  trigger: Trigger;
  columnId: string;
  cardId: string;
}): void {
  after(() => execute(params).catch(() => {}));
}

async function execute(params: {
  boardId: string;
  trigger: Trigger;
  columnId: string;
  cardId: string;
}): Promise<void> {
  const automations = await prisma.automation.findMany({
    where: {
      boardId: params.boardId,
      enabled: true,
      trigger: params.trigger,
      // coluna do gatilho: nula = qualquer coluna; senão precisa bater.
      OR: [{ triggerColumnId: null }, { triggerColumnId: params.columnId }],
    },
  });
  if (automations.length === 0) return;

  const ctx = await loadCardContext(params.cardId);
  if (!ctx) return;

  for (const automation of automations) {
    const actions = parseActions(automation.actions);
    for (const action of actions) {
      try {
        await runAction(action, ctx, params.boardId);
      } catch {
        // best-effort: uma ação que falha não derruba as demais.
      }
    }
  }
}

function parseActions(raw: unknown): AutomationActionInput[] {
  if (!Array.isArray(raw)) return [];
  const out: AutomationActionInput[] = [];
  for (const item of raw) {
    const parsed = automationActionSchema.safeParse(item);
    if (parsed.success) out.push(parsed.data);
  }
  return out;
}

async function loadCardContext(cardId: string): Promise<CardContext | null> {
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    include: {
      column: { include: { board: { include: { organization: true } } } },
      fieldValues: { include: { field: true } },
    },
  });
  if (!card) return null;

  const fields: Record<string, string> = {};
  for (const fv of card.fieldValues) {
    fields[fv.field.name.toLowerCase()] = fv.value;
  }

  const base = process.env.AUTH_URL?.replace(/\/$/, "") ?? "";
  const slug = card.column.board.organization.slug;
  const url = `${base}/orgs/${slug}/boards/${card.column.boardId}/cards/${card.id}`;

  return {
    id: card.id,
    title: card.title,
    description: card.description ?? "",
    url,
    organizationId: card.column.board.organizationId,
    columnId: card.columnId,
    columnName: card.column.name,
    fields,
  };
}

/**
 * Substitui tokens `{{...}}` no texto pelos dados do card. Suporta:
 *   {{card.id}} {{card.title}} {{card.description}} {{card.url}}
 *   {{column.name}}  {{field.<NomeDoCampo>}}
 * Tokens desconhecidos viram string vazia.
 */
export function renderTemplate(input: string, ctx: CardContext): string {
  return input.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, raw: string) => {
    const key = raw.trim();
    if (key === "card.id") return ctx.id;
    if (key === "card.title") return ctx.title;
    if (key === "card.description") return ctx.description;
    if (key === "card.url") return ctx.url;
    if (key === "column.name") return ctx.columnName;
    if (key.startsWith("field.")) {
      return ctx.fields[key.slice("field.".length).toLowerCase()] ?? "";
    }
    return "";
  });
}

async function runAction(
  action: AutomationActionInput,
  ctx: CardContext,
  boardId: string,
): Promise<void> {
  switch (action.type) {
    case "MOVE_CARD": {
      const target = await prisma.column.findFirst({
        where: { id: action.columnId, boardId },
      });
      if (!target || target.id === ctx.columnId) return;
      const last = await prisma.card.findFirst({
        where: { columnId: target.id, archivedAt: null },
        orderBy: { rank: "desc" },
      });
      await prisma.card.update({
        where: { id: ctx.id },
        data: { columnId: target.id, rank: rankBetween(last?.rank ?? null, null) },
      });
      await logAutomationActivity({
        boardId,
        cardId: ctx.id,
        type: "CARD_MOVED",
        payload: { from: ctx.columnName, to: target.name, via: "automation" },
      });
      // mantém o contexto coerente caso outra ação use a coluna.
      ctx.columnId = target.id;
      ctx.columnName = target.name;
      return;
    }
    case "CREATE_CARD": {
      // Cria um card em OUTRO quadro (ou no mesmo), sempre na MESMA organização.
      const target = await prisma.column.findFirst({
        where: { id: action.columnId, boardId: action.boardId },
        include: { board: { select: { organizationId: true, archivedAt: true } } },
      });
      if (
        !target ||
        target.board.archivedAt ||
        target.board.organizationId !== ctx.organizationId
      ) {
        return; // coluna inexistente, quadro arquivado ou de outra org: ignora.
      }
      const last = await prisma.card.findFirst({
        where: { columnId: target.id, archivedAt: null },
        orderBy: { rank: "desc" },
      });
      const created = await prisma.card.create({
        data: {
          columnId: target.id,
          title: renderTemplate(action.title, ctx),
          description: action.description
            ? renderTemplate(action.description, ctx)
            : null,
          rank: rankBetween(last?.rank ?? null, null),
        },
      });
      // Registra a criação no quadro de destino (sem reentrar no motor → anti-loop).
      await logAutomationActivity({
        boardId: action.boardId,
        cardId: created.id,
        type: "CARD_CREATED",
        payload: { title: created.title, via: "automation" },
      });
      return;
    }
    case "ADD_LABEL": {
      const label = await prisma.label.findFirst({
        where: { id: action.labelId, boardId },
      });
      if (!label) return;
      await prisma.cardLabel.upsert({
        where: { cardId_labelId: { cardId: ctx.id, labelId: label.id } },
        update: {},
        create: { cardId: ctx.id, labelId: label.id },
      });
      return;
    }
    case "REMOVE_LABEL": {
      await prisma.cardLabel.deleteMany({
        where: { cardId: ctx.id, labelId: action.labelId },
      });
      return;
    }
    case "ADD_COMMENT": {
      await prisma.comment.create({
        data: { cardId: ctx.id, authorId: null, body: renderTemplate(action.body, ctx) },
      });
      await logAutomationActivity({
        boardId,
        cardId: ctx.id,
        type: "COMMENT_ADDED",
        payload: { via: "automation" },
      });
      return;
    }
    case "HTTP_REQUEST": {
      const url = renderTemplate(action.url, ctx);
      const headers: Record<string, string> = {};
      for (const [k, v] of Object.entries(action.headers ?? {})) {
        headers[k] = renderTemplate(v, ctx);
      }
      const init: RequestInit = { method: action.method, headers };
      if (action.method === "POST" && action.body) {
        init.body = renderTemplate(action.body, ctx);
        if (!headers["Content-Type"] && !headers["content-type"]) {
          headers["Content-Type"] = "application/json";
        }
      }
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      try {
        await fetch(url, { ...init, signal: controller.signal });
      } finally {
        clearTimeout(timer);
      }
      return;
    }
  }
}
