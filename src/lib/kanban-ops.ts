import { prisma } from "@/lib/prisma";
import { rankBetween } from "@/lib/rank";
import { logActivity } from "@/lib/activity";
import { runAutomations } from "@/lib/automations";
import { applyCardFields } from "@/lib/custom-fields";

/**
 * Operações de Kanban escopadas a uma organização, reutilizadas pela API
 * REST e pelo servidor MCP. Lançam Error com mensagem amigável em falha.
 */

export async function opListBoards(organizationId: string) {
  const boards = await prisma.board.findMany({
    where: { organizationId, archivedAt: null },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, description: true },
  });
  return { boards };
}

async function boardInOrg(boardId: string, organizationId: string) {
  return prisma.board.findFirst({
    where: { id: boardId, organizationId, archivedAt: null },
  });
}

export async function opGetBoard(organizationId: string, boardId: string) {
  const board = await prisma.board.findFirst({
    where: { id: boardId, organizationId, archivedAt: null },
    include: {
      columns: {
        orderBy: { rank: "asc" },
        include: {
          cards: {
            where: { archivedAt: null },
            orderBy: { rank: "asc" },
            select: { id: true, title: true, description: true, dueDate: true },
          },
        },
      },
      customFields: {
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, type: true },
      },
    },
  });
  if (!board) throw new Error("Quadro não encontrado.");
  return {
    board: {
      id: board.id,
      name: board.name,
      columns: board.columns.map((c) => ({
        id: c.id,
        name: c.name,
        cards: c.cards,
      })),
      customFields: board.customFields,
    },
  };
}

export async function opCreateCard(
  organizationId: string,
  input: {
    boardId: string;
    columnId: string;
    title: string;
    description?: string;
    fields?: Record<string, string>;
    via?: string; // rótulo para o payload da atividade (ex.: "mcp", "api")
  },
) {
  const board = await boardInOrg(input.boardId, organizationId);
  if (!board) throw new Error("Quadro não encontrado.");

  const column = await prisma.column.findFirst({
    where: { id: input.columnId, boardId: input.boardId },
  });
  if (!column) throw new Error("columnId inválido para este quadro.");

  const last = await prisma.card.findFirst({
    where: { columnId: column.id, archivedAt: null },
    orderBy: { rank: "desc" },
  });

  const hasFields = !!input.fields && Object.keys(input.fields).length > 0;

  // Cria o card. Se o cliente enviou `fields`, roda create+applyCardFields
  // numa transação: qualquer erro de validação dispara rollback (nada de card
  // órfão com valores inválidos no banco).
  const card = hasFields
    ? await prisma.$transaction(async (tx) => {
        const created = await tx.card.create({
          data: {
            columnId: column.id,
            title: input.title,
            description: input.description || null,
            rank: rankBetween(last?.rank ?? null, null),
          },
        });
        const res = await applyCardFields(
          created.id,
          input.boardId,
          input.fields!,
          tx,
        );
        if (res.error) throw new Error(res.error);
        return created;
      })
    : await prisma.card.create({
        data: {
          columnId: column.id,
          title: input.title,
          description: input.description || null,
          rank: rankBetween(last?.rank ?? null, null),
        },
      });

  await logActivity({
    boardId: input.boardId,
    cardId: card.id,
    type: "CARD_CREATED",
    payload: { title: card.title, via: input.via ?? "mcp" },
  });
  runAutomations({
    boardId: input.boardId,
    trigger: "CARD_CREATED",
    columnId: column.id,
    cardId: card.id,
  });

  // Só busca `fields` quando o cliente enviou (evita query extra no caminho comum).
  if (hasFields) {
    const boardFields = await prisma.customField.findMany({
      where: { boardId: input.boardId },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, type: true },
    });
    const values = await prisma.cardFieldValue.findMany({
      where: { cardId: card.id },
      select: { fieldId: true, value: true },
    });
    const valueBy = new Map(values.map((v) => [v.fieldId, v.value]));
    const fields = boardFields.map((f) => ({
      id: f.id,
      name: f.name,
      type: f.type,
      value: valueBy.get(f.id) ?? null,
    }));
    return {
      card: { id: card.id, title: card.title, columnId: card.columnId, fields },
    };
  }

  return { card: { id: card.id, title: card.title, columnId: card.columnId } };
}

export async function opMoveCard(
  organizationId: string,
  input: { cardId: string; columnId: string },
) {
  const card = await prisma.card.findUnique({
    where: { id: input.cardId },
    include: { column: { include: { board: true } } },
  });
  if (!card || card.column.board.organizationId !== organizationId) {
    throw new Error("Card não encontrado.");
  }

  const target = await prisma.column.findFirst({
    where: { id: input.columnId, boardId: card.column.boardId },
  });
  if (!target) throw new Error("columnId inválido para este quadro.");

  const last = await prisma.card.findFirst({
    where: { columnId: target.id, archivedAt: null },
    orderBy: { rank: "desc" },
  });
  await prisma.card.update({
    where: { id: card.id },
    data: { columnId: target.id, rank: rankBetween(last?.rank ?? null, null) },
  });

  if (target.id !== card.columnId) {
    await logActivity({
      boardId: card.column.boardId,
      cardId: card.id,
      type: "CARD_MOVED",
      payload: { from: card.column.name, to: target.name, via: "mcp" },
    });
    runAutomations({
      boardId: card.column.boardId,
      trigger: "CARD_MOVED_TO_COLUMN",
      columnId: target.id,
      cardId: card.id,
    });
  }

  return { card: { id: card.id, columnId: target.id } };
}

export async function opAddComment(
  organizationId: string,
  input: { cardId: string; body: string },
) {
  const card = await prisma.card.findUnique({
    where: { id: input.cardId },
    include: { column: { include: { board: true } } },
  });
  if (!card || card.column.board.organizationId !== organizationId) {
    throw new Error("Card não encontrado.");
  }

  const comment = await prisma.comment.create({
    data: { cardId: card.id, authorId: null, body: input.body },
  });
  await logActivity({
    boardId: card.column.boardId,
    cardId: card.id,
    type: "COMMENT_ADDED",
    payload: { via: "mcp" },
  });

  return { comment: { id: comment.id, body: comment.body } };
}
