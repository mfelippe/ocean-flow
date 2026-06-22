"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireOrgAdmin } from "@/lib/authz";
import { generateWebhookSecret } from "@/lib/webhooks";
import { webhookSchema } from "@/lib/validations";

export type FormState = { error?: string; ok?: boolean } | undefined;

async function revalidateOrg(orgId: string) {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { slug: true },
  });
  if (org) revalidatePath(`/orgs/${org.slug}`);
}

export async function createWebhook(
  orgId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireOrgAdmin(orgId);

  const parsed = webhookSchema.safeParse({ url: formData.get("url") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  await prisma.webhook.create({
    data: {
      organizationId: orgId,
      url: parsed.data.url,
      secret: generateWebhookSecret(),
    },
  });

  await revalidateOrg(orgId);
  return { ok: true };
}

export async function toggleWebhook(webhookId: string): Promise<void> {
  const hook = await prisma.webhook.findUnique({ where: { id: webhookId } });
  if (!hook) return;
  await requireOrgAdmin(hook.organizationId);

  await prisma.webhook.update({
    where: { id: webhookId },
    data: { active: !hook.active },
  });
  await revalidateOrg(hook.organizationId);
}

export async function deleteWebhook(webhookId: string): Promise<void> {
  const hook = await prisma.webhook.findUnique({ where: { id: webhookId } });
  if (!hook) return;
  await requireOrgAdmin(hook.organizationId);

  await prisma.webhook.delete({ where: { id: webhookId } });
  await revalidateOrg(hook.organizationId);
}
