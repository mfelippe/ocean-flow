"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireBoardWrite, requireOrgWrite } from "@/lib/authz";
import { boardSchema, columnSchema, cardSchema } from "@/lib/validations";
import { rankBetween } from "@/lib/rank";

export type FormState = { error?: string } | undefined;

function boardPath(slug: string, boardId: string): string {
  return `/orgs/${slug}/boards/${boardId}`;
}

// ─── Board ───────────────────────────────────────────────────────────

export async function createBoard(
  orgId: string,
  slug: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireOrgWrite(orgId);
  const parsed = boardSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const board = await prisma.board.create({
    data: { organizationId: orgId, name: parsed.data.name },
  });
  redirect(boardPath(slug, board.id));
}

export async function renameBoard(
  boardId: string,
  formData: FormData,
): Promise<void> {
  const { board } = await requireBoardWrite(boardId);
  const parsed = boardSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return;
  await prisma.board.update({
    where: { id: boardId },
    data: { name: parsed.data.name },
  });
  revalidatePath(boardPath(board.organization.slug, boardId));
}

export async function archiveBoard(boardId: string): Promise<void> {
  const { board } = await requireBoardWrite(boardId);
  await prisma.board.update({
    where: { id: boardId },
    data: { archivedAt: new Date() },
  });
  redirect(`/orgs/${board.organization.slug}`);
}

// ─── Column ──────────────────────────────────────────────────────────

export async function createColumn(
  boardId: string,
  formData: FormData,
): Promise<void> {
  const { board } = await requireBoardWrite(boardId);
  const parsed = columnSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return;
  const last = await prisma.column.findFirst({
    where: { boardId },
    orderBy: { rank: "desc" },
  });
  await prisma.column.create({
    data: {
      boardId,
      name: parsed.data.name,
      rank: rankBetween(last?.rank ?? null, null),
    },
  });
  revalidatePath(boardPath(board.organization.slug, boardId));
}

export async function renameColumn(
  columnId: string,
  formData: FormData,
): Promise<void> {
  const column = await prisma.column.findUnique({ where: { id: columnId } });
  if (!column) return;
  const { board } = await requireBoardWrite(column.boardId);
  const parsed = columnSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return;
  await prisma.column.update({
    where: { id: columnId },
    data: { name: parsed.data.name },
  });
  revalidatePath(boardPath(board.organization.slug, column.boardId));
}

export async function deleteColumn(columnId: string): Promise<void> {
  const column = await prisma.column.findUnique({ where: { id: columnId } });
  if (!column) return;
  const { board } = await requireBoardWrite(column.boardId);
  await prisma.column.delete({ where: { id: columnId } }); // cascade nos cards
  revalidatePath(boardPath(board.organization.slug, column.boardId));
}

export async function moveColumn(
  columnId: string,
  direction: "left" | "right",
): Promise<void> {
  const column = await prisma.column.findUnique({ where: { id: columnId } });
  if (!column) return;
  const { board } = await requireBoardWrite(column.boardId);
  const cols = await prisma.column.findMany({
    where: { boardId: column.boardId },
    orderBy: { rank: "asc" },
  });
  const i = cols.findIndex((c) => c.id === columnId);
  if (direction === "left" && i > 0) {
    const rank = rankBetween(cols[i - 2]?.rank ?? null, cols[i - 1].rank);
    await prisma.column.update({ where: { id: columnId }, data: { rank } });
  } else if (direction === "right" && i < cols.length - 1) {
    const rank = rankBetween(cols[i + 1].rank, cols[i + 2]?.rank ?? null);
    await prisma.column.update({ where: { id: columnId }, data: { rank } });
  }
  revalidatePath(boardPath(board.organization.slug, column.boardId));
}

// ─── Card ────────────────────────────────────────────────────────────

export async function createCard(
  columnId: string,
  formData: FormData,
): Promise<void> {
  const column = await prisma.column.findUnique({ where: { id: columnId } });
  if (!column) return;
  const { board, user } = await requireBoardWrite(column.boardId);
  const parsed = cardSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") ?? "",
  });
  if (!parsed.success) return;
  const last = await prisma.card.findFirst({
    where: { columnId, archivedAt: null },
    orderBy: { rank: "desc" },
  });
  await prisma.card.create({
    data: {
      columnId,
      title: parsed.data.title,
      description: parsed.data.description || null,
      rank: rankBetween(last?.rank ?? null, null),
      createdById: user.id,
    },
  });
  revalidatePath(boardPath(board.organization.slug, column.boardId));
}

export async function updateCard(
  cardId: string,
  formData: FormData,
): Promise<void> {
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    include: { column: true },
  });
  if (!card) return;
  const { board } = await requireBoardWrite(card.column.boardId);
  const parsed = cardSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") ?? "",
  });
  if (!parsed.success) return;
  await prisma.card.update({
    where: { id: cardId },
    data: {
      title: parsed.data.title,
      description: parsed.data.description || null,
    },
  });
  revalidatePath(boardPath(board.organization.slug, card.column.boardId));
}

export async function archiveCard(cardId: string): Promise<void> {
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    include: { column: true },
  });
  if (!card) return;
  const { board } = await requireBoardWrite(card.column.boardId);
  await prisma.card.update({
    where: { id: cardId },
    data: { archivedAt: new Date() },
  });
  revalidatePath(boardPath(board.organization.slug, card.column.boardId));
}

export async function moveCard(
  cardId: string,
  action: "up" | "down" | "prev" | "next",
): Promise<void> {
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    include: { column: true },
  });
  if (!card) return;
  const { board } = await requireBoardWrite(card.column.boardId);
  const boardId = card.column.boardId;

  if (action === "up" || action === "down") {
    const cards = await prisma.card.findMany({
      where: { columnId: card.columnId, archivedAt: null },
      orderBy: { rank: "asc" },
    });
    const i = cards.findIndex((c) => c.id === cardId);
    if (action === "up" && i > 0) {
      const rank = rankBetween(cards[i - 2]?.rank ?? null, cards[i - 1].rank);
      await prisma.card.update({ where: { id: cardId }, data: { rank } });
    } else if (action === "down" && i < cards.length - 1) {
      const rank = rankBetween(cards[i + 1].rank, cards[i + 2]?.rank ?? null);
      await prisma.card.update({ where: { id: cardId }, data: { rank } });
    }
  } else {
    // mover para a coluna anterior/seguinte → vai para o fim da coluna destino
    const cols = await prisma.column.findMany({
      where: { boardId },
      orderBy: { rank: "asc" },
    });
    const ci = cols.findIndex((c) => c.id === card.columnId);
    const target = action === "prev" ? cols[ci - 1] : cols[ci + 1];
    if (target) {
      const last = await prisma.card.findFirst({
        where: { columnId: target.id, archivedAt: null },
        orderBy: { rank: "desc" },
      });
      await prisma.card.update({
        where: { id: cardId },
        data: { columnId: target.id, rank: rankBetween(last?.rank ?? null, null) },
      });
    }
  }
  revalidatePath(boardPath(board.organization.slug, boardId));
}
