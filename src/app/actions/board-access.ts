"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireBoardManage } from "@/lib/authz";
import { boardMemberSchema } from "@/lib/validations";

export type FormState = { error?: string; ok?: boolean } | undefined;

function revalidateBoard(slug: string, boardId: string) {
  revalidatePath(`/orgs/${slug}/boards/${boardId}`);
  revalidatePath(`/orgs/${slug}/boards/${boardId}/settings`);
}

export async function setBoardVisibility(
  boardId: string,
  visibility: "ORG" | "PRIVATE",
): Promise<void> {
  const { board } = await requireBoardManage(boardId);
  if (visibility !== "ORG" && visibility !== "PRIVATE") return;

  await prisma.board.update({ where: { id: boardId }, data: { visibility } });
  revalidateBoard(board.organization.slug, boardId);
}

export async function addBoardMember(
  boardId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { board } = await requireBoardManage(boardId);

  const parsed = boardMemberSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const target = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (!target) {
    return { error: "Nenhum usuário com esse e-mail." };
  }

  // A pessoa precisa pertencer à organização do quadro.
  const orgMember = await prisma.membership.findUnique({
    where: {
      userId_organizationId: {
        userId: target.id,
        organizationId: board.organizationId,
      },
    },
  });
  if (!orgMember) {
    return { error: "A pessoa precisa ser membro da organização primeiro." };
  }

  await prisma.boardMembership.upsert({
    where: { boardId_userId: { boardId, userId: target.id } },
    update: { role: parsed.data.role },
    create: { boardId, userId: target.id, role: parsed.data.role },
  });

  revalidateBoard(board.organization.slug, boardId);
  return { ok: true };
}

export async function removeBoardMember(
  membershipId: string,
): Promise<void> {
  const membership = await prisma.boardMembership.findUnique({
    where: { id: membershipId },
    include: {
      board: { include: { organization: { select: { slug: true } } } },
    },
  });
  if (!membership) return;
  await requireBoardManage(membership.boardId);

  await prisma.boardMembership.delete({ where: { id: membershipId } });
  revalidateBoard(membership.board.organization.slug, membership.boardId);
}
