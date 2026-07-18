import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { jsonError, requireApiToken } from "@/lib/api-auth";
import { rankBetween } from "@/lib/rank";
import { logActivity } from "@/lib/activity";
import { runAutomations } from "@/lib/automations";
import { apiCardUpdateSchema } from "@/lib/validations";
import { applyCardFields } from "@/lib/custom-fields";

/** Carrega um card garantindo que pertence à organização do token. */
async function loadCardForOrg(cardId: string, organizationId: string) {
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    include: { column: { include: { board: true } } },
  });
  if (!card || card.column.board.organizationId !== organizationId) return null;
  return card;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ cardId: string }> },
) {
  const auth = await requireApiToken(request);
  if (auth instanceof NextResponse) return auth;
  const { cardId } = await params;

  const card = await prisma.card.findUnique({
    where: { id: cardId },
    include: {
      column: { include: { board: { select: { id: true, organizationId: true } } } },
      labels: { include: { label: true } },
      comments: {
        include: { author: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      },
      attachments: { orderBy: { createdAt: "desc" } },
      fieldValues: true,
    },
  });
  if (!card || card.column.board.organizationId !== auth.organizationId) {
    return jsonError(404, "Card não encontrado.");
  }

  const customFields = await prisma.customField.findMany({
    where: { boardId: card.column.board.id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    card: {
      id: card.id,
      title: card.title,
      description: card.description,
      dueDate: card.dueDate,
      archivedAt: card.archivedAt,
      createdAt: card.createdAt,
      boardId: card.column.board.id,
      column: { id: card.column.id, name: card.column.name },
      labels: card.labels.map((cl) => ({
        id: cl.label.id,
        name: cl.label.name,
        color: cl.label.color,
      })),
      comments: card.comments.map((c) => ({
        id: c.id,
        body: c.body,
        author: c.author?.name ?? null,
        createdAt: c.createdAt,
      })),
      attachments: card.attachments.map((a) => ({
        id: a.id,
        fileName: a.fileName,
        mimeType: a.mimeType,
        size: a.size,
      })),
      fields: customFields.map((f) => ({
        id: f.id,
        name: f.name,
        type: f.type,
        value: card.fieldValues.find((v) => v.fieldId === f.id)?.value ?? null,
      })),
    },
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ cardId: string }> },
) {
  const auth = await requireApiToken(request);
  if (auth instanceof NextResponse) return auth;
  const { cardId } = await params;

  const card = await loadCardForOrg(cardId, auth.organizationId);
  if (!card) return jsonError(404, "Card não encontrado.");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "Corpo JSON inválido.");
  }

  const parsed = apiCardUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }
  const input = parsed.data;

  const data: Prisma.CardUpdateInput = {};
  let movedTo: string | null = null;

  if (input.title !== undefined) data.title = input.title;
  if (input.description !== undefined) data.description = input.description;
  if (input.dueDate !== undefined) {
    if (input.dueDate === null) {
      data.dueDate = null;
    } else {
      const d = new Date(input.dueDate);
      if (Number.isNaN(d.getTime())) return jsonError(400, "dueDate inválido.");
      data.dueDate = d;
    }
  }

  // Mover de coluna: a coluna destino precisa ser do mesmo board.
  if (input.columnId !== undefined && input.columnId !== card.columnId) {
    const target = await prisma.column.findFirst({
      where: { id: input.columnId, boardId: card.column.boardId },
    });
    if (!target) return jsonError(400, "columnId inválido para este quadro.");
    const last = await prisma.card.findFirst({
      where: { columnId: target.id, archivedAt: null },
      orderBy: { rank: "desc" },
    });
    data.column = { connect: { id: target.id } };
    data.rank = rankBetween(last?.rank ?? null, null);
    movedTo = target.name;
  }

  const hasFields = !!input.fields && Object.keys(input.fields).length > 0;
  if (Object.keys(data).length === 0 && !hasFields) {
    return jsonError(400, "Nenhum campo para atualizar.");
  }

  const updated =
    Object.keys(data).length > 0
      ? await prisma.card.update({ where: { id: cardId }, data })
      : card;

  // Campos personalizados (mapa fieldId → valor; "" limpa). Reusa o helper
  // compartilhado com o create.
  if (input.fields) {
    const res = await applyCardFields(cardId, card.column.boardId, input.fields);
    if (res.error) return jsonError(400, res.error);
  }

  await logActivity({
    boardId: card.column.boardId,
    cardId: card.id,
    type: movedTo ? "CARD_MOVED" : "CARD_UPDATED",
    payload: movedTo
      ? { from: card.column.name, to: movedTo, via: "api" }
      : { title: updated.title, via: "api" },
  });
  if (input.columnId !== undefined && input.columnId !== card.columnId) {
    runAutomations({
      boardId: card.column.boardId,
      trigger: "CARD_MOVED_TO_COLUMN",
      columnId: input.columnId,
      cardId: card.id,
    });
  }

  return NextResponse.json({
    card: {
      id: updated.id,
      title: updated.title,
      description: updated.description,
      columnId: updated.columnId,
      dueDate: updated.dueDate,
    },
  });
}
