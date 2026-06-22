import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { jsonError, requireApiToken } from "@/lib/api-auth";
import { rankBetween } from "@/lib/rank";
import { logActivity } from "@/lib/activity";
import { apiCardUpdateSchema } from "@/lib/validations";

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
    },
  });
  if (!card || card.column.board.organizationId !== auth.organizationId) {
    return jsonError(404, "Card não encontrado.");
  }

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

  if (Object.keys(data).length === 0) {
    return jsonError(400, "Nenhum campo para atualizar.");
  }

  const updated = await prisma.card.update({ where: { id: cardId }, data });

  await logActivity({
    boardId: card.column.boardId,
    cardId: card.id,
    type: movedTo ? "CARD_MOVED" : "CARD_UPDATED",
    payload: movedTo
      ? { from: card.column.name, to: movedTo, via: "api" }
      : { title: updated.title, via: "api" },
  });

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
