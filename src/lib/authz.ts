import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export type EffectiveRole = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";

/**
 * Carrega um board e calcula o PAPEL EFETIVO do usuário nele:
 * - OWNER/ADMIN da org: acesso total a qualquer quadro.
 * - Demais: em quadro ORG, o papel do quadro sobrepõe o da org (se houver);
 *   em quadro PRIVATE, exige ser membro do quadro (senão 404).
 * Retorna o board (com slug da org), o papel da org e o papel efetivo.
 */
export async function getBoardContext(boardId: string) {
  const user = await requireUser();

  const board = await prisma.board.findUnique({
    where: { id: boardId },
    include: { organization: { select: { id: true, slug: true } } },
  });
  if (!board) notFound();

  const orgMembership = await prisma.membership.findUnique({
    where: {
      userId_organizationId: {
        userId: user.id,
        organizationId: board.organizationId,
      },
    },
  });
  if (!orgMembership) notFound();
  const orgRole = orgMembership.role;

  let role: EffectiveRole;
  if (orgRole === "OWNER" || orgRole === "ADMIN") {
    role = orgRole;
  } else {
    const boardMembership = await prisma.boardMembership.findUnique({
      where: { boardId_userId: { boardId: board.id, userId: user.id } },
    });
    if (board.visibility === "PRIVATE") {
      if (!boardMembership) notFound();
      role = boardMembership.role;
    } else {
      role = boardMembership?.role ?? orgRole;
    }
  }

  return { user, board, orgRole, role };
}

/** Igual a getBoardContext, mas exige permissão de escrita (não-VIEWER). */
export async function requireBoardWrite(boardId: string) {
  const ctx = await getBoardContext(boardId);
  if (ctx.role === "VIEWER") {
    throw new Error("Sem permissão de escrita neste quadro.");
  }
  return ctx;
}

/** Exige papel de administração do quadro (OWNER/ADMIN efetivo). Não-admins
 *  recebem 404 (a página de acesso não deve ser revelada). */
export async function requireBoardManage(boardId: string) {
  const ctx = await getBoardContext(boardId);
  if (ctx.role !== "OWNER" && ctx.role !== "ADMIN") {
    notFound();
  }
  return ctx;
}

/** Exige que o usuário seja SUPER ADMIN da instância. Caso contrário, 404
 *  (a página de admin não deve ser revelada a usuários comuns). */
export async function requireSuperAdmin() {
  const sessionUser = await requireUser();
  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { id: true, name: true, email: true, isSuperAdmin: true },
  });
  if (!user?.isSuperAdmin) notFound();
  return user;
}

/** Exige que o usuário seja OWNER ou ADMIN da organização (ações administrativas). */
export async function requireOrgAdmin(orgId: string) {
  const user = await requireUser();
  const membership = await prisma.membership.findUnique({
    where: { userId_organizationId: { userId: user.id, organizationId: orgId } },
  });
  if (!membership) notFound();
  if (membership.role !== "OWNER" && membership.role !== "ADMIN") {
    throw new Error("Apenas OWNER/ADMIN podem realizar esta ação.");
  }
  return { user, membership };
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
