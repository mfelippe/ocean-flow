"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/authz";

// `password` só vem preenchido na ação de reset (mostrado uma única vez).
export type ResetState =
  | { error?: string; password?: string }
  | undefined;

/**
 * Gera uma nova senha temporária para o usuário (mostrada uma única vez ao
 * super admin). Só super admin executa.
 */
export async function resetUserPassword(
  userId: string,
  _prev: ResetState,
  _formData: FormData,
): Promise<ResetState> {
  await requireSuperAdmin();

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return { error: "Usuário não encontrado." };

  // 12 chars url-safe — suficiente para senha temporária.
  const password = crypto.randomBytes(9).toString("base64url");
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await bcrypt.hash(password, 10) },
  });

  revalidatePath("/admin");
  return { password };
}

/** Bloqueia ou desbloqueia um usuário. Super admin não pode bloquear a si mesmo. */
export async function setUserBlocked(
  userId: string,
  blocked: boolean,
): Promise<void> {
  const admin = await requireSuperAdmin();
  if (userId === admin.id) return; // não bloqueia a própria conta

  await prisma.user.update({
    where: { id: userId },
    data: { blockedAt: blocked ? new Date() : null },
  });
  revalidatePath("/admin");
}
