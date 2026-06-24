"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireBoardWrite, requireOrgWrite } from "@/lib/authz";
import { boardSchema, columnSchema, cardSchema } from "@/lib/validations";
import { rankBetween } from "@/lib/rank";
import { logActivity } from "@/lib/activity";
import { runAutomations } from "@/lib/automations";

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
  const { user } = await requireOrgWrite(orgId);
  const parsed = boardSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  // Colunas padrão (ranks fracionários crescentes) — quadro já nasce usável.
  const r1 = rankBetween(null, null);
  const r2 = rankBetween(r1, null);
  const r3 = rankBetween(r2, null);

  // Quem cria vira ADMIN do quadro (mantém acesso mesmo se virar PRIVATE).
  const board = await prisma.board.create({
    data: {
      organizationId: orgId,
      name: parsed.data.name,
      members: { create: { userId: user.id, role: "ADMIN" } },
      columns: {
        create: [
          { name: "A Fazer", rank: r1 },
          { name: "Em Progresso", rank: r2 },
          { name: "Concluído", rank: r3 },
        ],
      },
    },
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
  const created = await prisma.card.create({
    data: {
      columnId,
      title: parsed.data.title,
      description: parsed.data.description || null,
      rank: rankBetween(last?.rank ?? null, null),
      createdById: user.id,
      assigneeId: user.id, // quem cria já fica como responsável
    },
  });
  await logActivity({
    boardId: column.boardId,
    cardId: created.id,
    actorId: user.id,
    type: "CARD_CREATED",
    payload: { title: created.title },
  });
  runAutomations({
    boardId: column.boardId,
    trigger: "CARD_CREATED",
    columnId,
    cardId: created.id,
  });
  revalidatePath(boardPath(board.organization.slug, column.boardId));
}

export async function archiveCard(cardId: string): Promise<void> {
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    include: { column: true },
  });
  if (!card) return;
  const { board, user } = await requireBoardWrite(card.column.boardId);
  await prisma.card.update({
    where: { id: cardId },
    data: { archivedAt: new Date() },
  });
  await logActivity({
    boardId: card.column.boardId,
    cardId,
    actorId: user.id,
    type: "CARD_ARCHIVED",
    payload: { title: card.title },
  });
  revalidatePath(boardPath(board.organization.slug, card.column.boardId));
}

/**
 * Persiste o resultado de um drag & drop: move o card para uma coluna do
 * mesmo board, na posição indicada pelo `rank` (calculado no cliente entre
 * os vizinhos). Grava apenas a linha movida.
 */
export async function moveCardTo(
  cardId: string,
  toColumnId: string,
  rank: string,
): Promise<void> {
  if (typeof rank !== "string" || rank.length === 0) return;

  const card = await prisma.card.findUnique({
    where: { id: cardId },
    include: { column: true },
  });
  if (!card) return;

  const { board, user } = await requireBoardWrite(card.column.boardId);

  // O destino precisa pertencer ao mesmo board (não cruza organizações/quadros).
  const target = await prisma.column.findUnique({ where: { id: toColumnId } });
  if (!target || target.boardId !== card.column.boardId) return;

  await prisma.card.update({
    where: { id: cardId },
    data: { columnId: toColumnId, rank },
  });
  // Só registra como movimentação quando muda de coluna.
  if (toColumnId !== card.columnId) {
    await logActivity({
      boardId: card.column.boardId,
      cardId,
      actorId: user.id,
      type: "CARD_MOVED",
      payload: { from: card.column.name, to: target.name },
    });
    runAutomations({
      boardId: card.column.boardId,
      trigger: "CARD_MOVED_TO_COLUMN",
      columnId: toColumnId,
      cardId,
    });
  }
  revalidatePath(boardPath(board.organization.slug, card.column.boardId));
}
