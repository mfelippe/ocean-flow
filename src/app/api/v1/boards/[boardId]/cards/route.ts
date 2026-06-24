import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, requireApiToken } from "@/lib/api-auth";
import { rankBetween } from "@/lib/rank";
import { logActivity } from "@/lib/activity";
import { runAutomations } from "@/lib/automations";
import { cardSchema } from "@/lib/validations";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ boardId: string }> },
) {
  const auth = await requireApiToken(request);
  if (auth instanceof NextResponse) return auth;
  const { boardId } = await params;

  const board = await prisma.board.findFirst({
    where: {
      id: boardId,
      organizationId: auth.organizationId,
      archivedAt: null,
    },
  });
  if (!board) return jsonError(404, "Quadro não encontrado.");

  let body: { columnId?: unknown; title?: unknown; description?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "Corpo JSON inválido.");
  }

  const parsed = cardSchema.safeParse({
    title: body.title,
    description: body.description ?? "",
  });
  if (!parsed.success) {
    return jsonError(400, parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const columnId = String(body.columnId ?? "");
  const column = await prisma.column.findFirst({
    where: { id: columnId, boardId },
  });
  if (!column) {
    return jsonError(400, "columnId inválido para este quadro.");
  }

  const last = await prisma.card.findFirst({
    where: { columnId, archivedAt: null },
    orderBy: { rank: "desc" },
  });
  const card = await prisma.card.create({
    data: {
      columnId,
      title: parsed.data.title,
      description: parsed.data.description || null,
      rank: rankBetween(last?.rank ?? null, null),
    },
  });

  await logActivity({
    boardId,
    cardId: card.id,
    type: "CARD_CREATED",
    payload: { title: card.title, via: "api" },
  });
  runAutomations({
    boardId,
    trigger: "CARD_CREATED",
    columnId,
    cardId: card.id,
  });

  return NextResponse.json(
    { card: { id: card.id, title: card.title, columnId: card.columnId } },
    { status: 201 },
  );
}
