"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { uniqueOrgSlug } from "@/lib/slug";
import { addMemberSchema, createOrgSchema } from "@/lib/validations";

export type FormState = { error?: string; success?: string } | undefined;

export async function createOrganization(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();

  const parsed = createOrgSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const slug = await uniqueOrgSlug(parsed.data.name);
  const org = await prisma.organization.create({
    data: {
      name: parsed.data.name,
      slug,
      memberships: { create: { userId: user.id, role: "OWNER" } },
    },
  });

  redirect(`/orgs/${org.slug}`);
}

export async function addMember(
  orgId: string,
  slug: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();

  // Apenas OWNER/ADMIN podem adicionar membros.
  const caller = await prisma.membership.findUnique({
    where: { userId_organizationId: { userId: user.id, organizationId: orgId } },
  });
  if (!caller || (caller.role !== "OWNER" && caller.role !== "ADMIN")) {
    return { error: "Você não tem permissão para adicionar membros." };
  }

  const parsed = addMemberSchema.safeParse({
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
    return {
      error: "Nenhum usuário com esse e-mail. Peça para a pessoa se cadastrar primeiro.",
    };
  }

  await prisma.membership.upsert({
    where: {
      userId_organizationId: { userId: target.id, organizationId: orgId },
    },
    update: { role: parsed.data.role },
    create: {
      userId: target.id,
      organizationId: orgId,
      role: parsed.data.role,
    },
  });

  revalidatePath(`/orgs/${slug}`);
  return { success: "Membro adicionado." };
}
