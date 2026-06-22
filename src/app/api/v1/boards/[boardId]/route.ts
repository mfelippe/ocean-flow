import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, requireApiToken } from "@/lib/api-auth";

export async function GET(
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
    },
  });
  if (!board) return jsonError(404, "Quadro não encontrado.");

  return NextResponse.json({
    board: {
      id: board.id,
      name: board.name,
      columns: board.columns.map((c) => ({
        id: c.id,
        name: c.name,
        cards: c.cards,
      })),
    },
  });
}
