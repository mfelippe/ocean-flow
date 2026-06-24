"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireBoardManage, requireBoardWrite } from "@/lib/authz";
import { logActivity } from "@/lib/activity";
import { rankBetween } from "@/lib/rank";
import { cardSchema, commentSchema, labelSchema } from "@/lib/validations";

export type FormState = { error?: string; ok?: boolean } | undefined;

async function loadCard(cardId: string) {
  return prisma.card.findUnique({
    where: { id: cardId },
    include: {
      column: {
        include: {
          board: { include: { organization: { select: { slug: true } } } },
        },
      },
    },
  });
}

function revalidateCard(slug: string, boardId: string, cardId: string) {
  revalidatePath(`/orgs/${slug}/boards/${boardId}`);
  revalidatePath(`/orgs/${slug}/boards/${boardId}/cards/${cardId}`);
}

// ─── Conteúdo (título + descrição em markdown) ───────────────────────

export async function updateCardContent(
  cardId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const card = await loadCard(cardId);
  if (!card) return { error: "Card não encontrado." };
  const { user } = await requireBoardWrite(card.column.boardId);

  const parsed = cardSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  await prisma.card.update({
    where: { id: cardId },
    data: {
      title: parsed.data.title,
      description: parsed.data.description || null,
    },
  });
  await logActivity({
    boardId: card.column.boardId,
    cardId,
    actorId: user.id,
    type: "CARD_UPDATED",
  });

  revalidateCard(card.column.board.organization.slug, card.column.boardId, cardId);
  return { ok: true };
}

// ─── Ações de admin do quadro (desarquivar, excluir, mover entre quadros) ──

export async function unarchiveCard(cardId: string): Promise<void> {
  const card = await loadCard(cardId);
  if (!card) return;
  await requireBoardManage(card.column.boardId);
  await prisma.card.update({ where: { id: cardId }, data: { archivedAt: null } });
  revalidateCard(card.column.board.organization.slug, card.column.boardId, cardId);
  revalidatePath(
    `/orgs/${card.column.board.organization.slug}/boards/${card.column.boardId}/settings`,
  );
}

export async function deleteCardPermanent(cardId: string): Promise<void> {
  const card = await loadCard(cardId);
  if (!card) return;
  const { board } = await requireBoardManage(card.column.boardId);
  await prisma.card.delete({ where: { id: cardId } }); // cascade em comments/anexos/etc.
  revalidatePath(`/orgs/${board.organization.slug}/boards/${card.column.boardId}`);
  revalidatePath(
    `/orgs/${board.organization.slug}/boards/${card.column.boardId}/settings`,
  );
}

/** Move um card para OUTRO quadro da mesma organização (primeira coluna). */
export async function moveCardToBoard(
  cardId: string,
  targetBoardId: string,
): Promise<void> {
  const card = await loadCard(cardId);
  if (!card) return;
  const { board, user } = await requireBoardManage(card.column.boardId);
  if (targetBoardId === card.column.boardId) return;

  // O quadro de destino precisa ser da MESMA organização e não arquivado.
  const target = await prisma.board.findFirst({
    where: {
      id: targetBoardId,
      organizationId: board.organizationId,
      archivedAt: null,
    },
    include: { columns: { orderBy: { rank: "asc" }, take: 1 } },
  });
  const destColumn = target?.columns[0];
  if (!destColumn) return; // quadro inválido ou sem colunas

  const last = await prisma.card.findFirst({
    where: { columnId: destColumn.id, archivedAt: null },
    orderBy: { rank: "desc" },
  });
  await prisma.card.update({
    where: { id: cardId },
    data: { columnId: destColumn.id, rank: rankBetween(last?.rank ?? null, null) },
  });
  await logActivity({
    boardId: targetBoardId,
    cardId,
    actorId: user.id,
    type: "CARD_MOVED",
    payload: { from: card.column.name, to: destColumn.name, via: "admin" },
  });

  const slug = board.organization.slug;
  revalidatePath(`/orgs/${slug}/boards/${card.column.boardId}`);
  revalidatePath(`/orgs/${slug}/boards/${targetBoardId}`);
  revalidatePath(`/orgs/${slug}/boards/${targetBoardId}/cards/${cardId}`);
}

// ─── Responsável (assignee) ──────────────────────────────────────────

export async function setCardAssignee(
  cardId: string,
  assigneeId: string | null,
): Promise<void> {
  const card = await loadCard(cardId);
  if (!card) return;
  await requireBoardWrite(card.column.boardId);

  // Vazio = remover responsável. Senão, precisa ser membro da org do quadro.
  let next: string | null = null;
  if (assigneeId) {
    const member = await prisma.membership.findFirst({
      where: { userId: assigneeId, organizationId: card.column.board.organizationId },
      select: { userId: true },
    });
    if (!member) return; // ignora ids fora da organização
    next = assigneeId;
  }

  await prisma.card.update({ where: { id: cardId }, data: { assigneeId: next } });
  revalidateCard(card.column.board.organization.slug, card.column.boardId, cardId);
}

// ─── Due date ────────────────────────────────────────────────────────

export async function setDueDate(
  cardId: string,
  formData: FormData,
): Promise<void> {
  const card = await loadCard(cardId);
  if (!card) return;
  await requireBoardWrite(card.column.boardId);

  const raw = String(formData.get("dueDate") ?? "").trim();
  const dueDate = raw ? new Date(raw) : null;
  if (dueDate && Number.isNaN(dueDate.getTime())) return;

  await prisma.card.update({ where: { id: cardId }, data: { dueDate } });
  revalidateCard(card.column.board.organization.slug, card.column.boardId, cardId);
}

// ─── Comentários ─────────────────────────────────────────────────────

export async function addComment(
  cardId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const card = await loadCard(cardId);
  if (!card) return { error: "Card não encontrado." };
  const { user } = await requireBoardWrite(card.column.boardId);

  const parsed = commentSchema.safeParse({ body: formData.get("body") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  await prisma.comment.create({
    data: { cardId, authorId: user.id, body: parsed.data.body },
  });
  await logActivity({
    boardId: card.column.boardId,
    cardId,
    actorId: user.id,
    type: "COMMENT_ADDED",
  });

  revalidateCard(card.column.board.organization.slug, card.column.boardId, cardId);
  return { ok: true };
}

export async function deleteComment(commentId: string): Promise<void> {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    include: {
      card: {
        include: {
          column: {
            include: {
              board: { include: { organization: { select: { slug: true } } } },
            },
          },
        },
      },
    },
  });
  if (!comment) return;
  const { user, role } = await requireBoardWrite(comment.card.column.boardId);

  // Autor remove o próprio comentário; OWNER/ADMIN removem qualquer um.
  const canDelete =
    comment.authorId === user.id || role === "OWNER" || role === "ADMIN";
  if (!canDelete) return;

  await prisma.comment.delete({ where: { id: commentId } });
  revalidateCard(
    comment.card.column.board.organization.slug,
    comment.card.column.boardId,
    comment.cardId,
  );
}

// ─── Labels ──────────────────────────────────────────────────────────

export async function createLabel(
  boardId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireBoardWrite(boardId);
  const parsed = labelSchema.safeParse({
    name: formData.get("name"),
    color: formData.get("color"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  await prisma.label.create({
    data: { boardId, name: parsed.data.name, color: parsed.data.color },
  });
  const board = await prisma.board.findUnique({
    where: { id: boardId },
    include: { organization: { select: { slug: true } } },
  });
  if (board) {
    revalidatePath(`/orgs/${board.organization.slug}/boards/${boardId}`);
  }
  return { ok: true };
}

export async function toggleCardLabel(
  cardId: string,
  labelId: string,
): Promise<void> {
  const card = await loadCard(cardId);
  if (!card) return;
  await requireBoardWrite(card.column.boardId);

  const existing = await prisma.cardLabel.findUnique({
    where: { cardId_labelId: { cardId, labelId } },
  });
  if (existing) {
    await prisma.cardLabel.delete({
      where: { cardId_labelId: { cardId, labelId } },
    });
  } else {
    await prisma.cardLabel.create({ data: { cardId, labelId } });
  }

  revalidateCard(card.column.board.organization.slug, card.column.boardId, cardId);
}
