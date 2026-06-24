"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { setupSchema } from "@/lib/validations";
import { uniqueOrgSlug } from "@/lib/slug";

export type FormState = { error?: string } | undefined;

/** Retorna true se a instância ainda não tem nenhum usuário (primeiro uso). */
export async function needsSetup(): Promise<boolean> {
  const count = await prisma.user.count();
  return count === 0;
}

/**
 * Conclui o setup inicial: cria o PRIMEIRO usuário como super admin da
 * instância + a primeira organização (papel OWNER). Só funciona enquanto não
 * houver nenhum usuário — depois disso é no-op por segurança.
 */
export async function completeSetup(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  // Trava: setup só roda na instância vazia (evita criar super admin depois).
  if ((await prisma.user.count()) > 0) {
    return { error: "A instância já foi configurada." };
  }

  const parsed = setupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    orgName: formData.get("orgName"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { name, email, password, orgName } = parsed.data;
  const passwordHash = await bcrypt.hash(password, 10);
  const slug = await uniqueOrgSlug(orgName);

  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      isSuperAdmin: true,
      memberships: {
        create: {
          role: "OWNER",
          organization: { create: { name: orgName, slug } },
        },
      },
    },
  });

  redirect("/login?setup=1");
}
