"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireOrgAdmin } from "@/lib/authz";
import { generateApiToken } from "@/lib/api-auth";
import { apiTokenSchema } from "@/lib/validations";

// `token` só vem preenchido na criação (exibido uma única vez).
export type TokenFormState =
  | { error?: string; token?: string; ok?: boolean }
  | undefined;

async function revalidateOrg(orgId: string) {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { slug: true },
  });
  if (org) revalidatePath(`/orgs/${org.slug}`);
}

export async function createApiToken(
  orgId: string,
  _prev: TokenFormState,
  formData: FormData,
): Promise<TokenFormState> {
  await requireOrgAdmin(orgId);

  const parsed = apiTokenSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { token, tokenHash, prefix } = generateApiToken();
  await prisma.apiToken.create({
    data: {
      organizationId: orgId,
      name: parsed.data.name,
      tokenHash,
      prefix,
    },
  });

  await revalidateOrg(orgId);
  return { ok: true, token }; // valor em claro, mostrado só agora
}

export async function revokeApiToken(tokenId: string): Promise<void> {
  const token = await prisma.apiToken.findUnique({ where: { id: tokenId } });
  if (!token) return;
  await requireOrgAdmin(token.organizationId);

  await prisma.apiToken.delete({ where: { id: tokenId } });
  await revalidateOrg(token.organizationId);
}
