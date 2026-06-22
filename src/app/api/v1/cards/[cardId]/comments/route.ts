import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, requireApiToken } from "@/lib/api-auth";
import { logActivity } from "@/lib/activity";
import { commentSchema } from "@/lib/validations";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ cardId: string }> },
) {
  const auth = await requireApiToken(request);
  if (auth instanceof NextResponse) return auth;
  const { cardId } = await params;

  const card = await prisma.card.findUnique({
    where: { id: cardId },
    include: { column: { include: { board: true } } },
  });
  if (!card || card.column.board.organizationId !== auth.organizationId) {
    return jsonError(404, "Card não encontrado.");
  }

  let body: { body?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "Corpo JSON inválido.");
  }

  const parsed = commentSchema.safeParse({ body: body.body });
  if (!parsed.success) {
    return jsonError(400, parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const comment = await prisma.comment.create({
    data: { cardId, authorId: null, body: parsed.data.body },
  });

  await logActivity({
    boardId: card.column.boardId,
    cardId,
    type: "COMMENT_ADDED",
    payload: { via: "api" },
  });

  return NextResponse.json(
    { comment: { id: comment.id, body: comment.body } },
    { status: 201 },
  );
}
