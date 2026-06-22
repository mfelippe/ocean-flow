import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

/**
 * Carrega um board garantindo que o usuário autenticado é membro da
 * organização dona. Retorna o board (com slug da org) e o papel do usuário.
 * Não-membros recebem 404 (não revelamos a existência do board).
 */
export async function getBoardContext(boardId: string) {
  const user = await requireUser();

  const board = await prisma.board.findUnique({
    where: { id: boardId },
    include: { organization: { select: { id: true, slug: true } } },
  });
  if (!board) notFound();

  const membership = await prisma.membership.findUnique({
    where: {
      userId_organizationId: {
        userId: user.id,
        organizationId: board.organizationId,
      },
    },
  });
  if (!membership) notFound();

  return { user, board, role: membership.role };
}

/** Igual a getBoardContext, mas exige permissão de escrita (não-VIEWER). */
export async function requireBoardWrite(boardId: string) {
  const ctx = await getBoardContext(boardId);
  if (ctx.role === "VIEWER") {
    throw new Error("Sem permissão de escrita neste quadro.");
  }
  return ctx;
}

/** Exige que o usuário seja membro com escrita (não-VIEWER) na organização. */
export async function requireOrgWrite(orgId: string) {
  const user = await requireUser();
  const membership = await prisma.membership.findUnique({
    where: { userId_organizationId: { userId: user.id, organizationId: orgId } },
  });
  if (!membership) notFound();
  if (membership.role === "VIEWER") {
    throw new Error("Sem permissão de escrita nesta organização.");
  }
  return { user, membership };
}
