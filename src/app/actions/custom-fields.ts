"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireBoardManage, requireBoardWrite } from "@/lib/authz";
import { customFieldSchema } from "@/lib/validations";
import { normalizeFieldValue } from "@/lib/custom-fields";

export type FormState = { error?: string; ok?: boolean } | undefined;

// ─── Definição de campos (admin do quadro) ──────────────────────────

export async function createCustomField(
  boardId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { board } = await requireBoardManage(boardId);
  const parsed = customFieldSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  await prisma.customField.create({
    data: { boardId, name: parsed.data.name, type: parsed.data.type },
  });
  revalidatePath(`/orgs/${board.organization.slug}/boards/${boardId}/settings`);
  revalidatePath(`/orgs/${board.organization.slug}/boards/${boardId}`);
  return { ok: true };
}

export async function deleteCustomField(fieldId: string): Promise<void> {
  const field = await prisma.customField.findUnique({ where: { id: fieldId } });
  if (!field) return;
  const { board } = await requireBoardManage(field.boardId);
  await prisma.customField.delete({ where: { id: fieldId } });
  revalidatePath(
    `/orgs/${board.organization.slug}/boards/${field.boardId}/settings`,
  );
}

// ─── Valores por card (qualquer membro com escrita) ──────────────────

export async function setCardFields(
  cardId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    include: {
      column: {
        include: {
          board: { include: { organization: { select: { slug: true } } } },
        },
      },
    },
  });
  if (!card) return { error: "Card não encontrado." };
  await requireBoardWrite(card.column.boardId);

  const fields = await prisma.customField.findMany({
    where: { boardId: card.column.boardId },
  });

  // Valida tudo antes de gravar.
  const updates: { fieldId: string; value: string }[] = [];
  for (const field of fields) {
    const result = normalizeFieldValue(field.type, formData.get(`field_${field.id}`));
    if ("error" in result) {
      return { error: `${field.name}: ${result.error}` };
    }
    updates.push({ fieldId: field.id, value: result.value });
  }

  for (const u of updates) {
    if (u.value === "") {
      await prisma.cardFieldValue.deleteMany({
        where: { cardId, fieldId: u.fieldId },
      });
    } else {
      await prisma.cardFieldValue.upsert({
        where: { cardId_fieldId: { cardId, fieldId: u.fieldId } },
        update: { value: u.value },
        create: { cardId, fieldId: u.fieldId, value: u.value },
      });
    }
  }

  const slug = card.column.board.organization.slug;
  revalidatePath(`/orgs/${slug}/boards/${card.column.boardId}/cards/${cardId}`);
  return { ok: true };
}
