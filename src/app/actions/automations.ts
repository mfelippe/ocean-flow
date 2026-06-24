"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireBoardManage } from "@/lib/authz";
import { automationSchema } from "@/lib/validations";

export type FormState = { error?: string; ok?: boolean } | undefined;

function settingsPath(slug: string, boardId: string): string {
  return `/orgs/${slug}/boards/${boardId}/settings`;
}

export async function createAutomation(
  boardId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { board } = await requireBoardManage(boardId);

  // O cliente serializa as ações como JSON num campo oculto.
  let actions: unknown = [];
  try {
    actions = JSON.parse(String(formData.get("actions") ?? "[]"));
  } catch {
    return { error: "Ações inválidas." };
  }

  const triggerColumnId = String(formData.get("triggerColumnId") ?? "").trim();
  const parsed = automationSchema.safeParse({
    name: formData.get("name"),
    trigger: formData.get("trigger"),
    triggerColumnId: triggerColumnId || null,
    actions,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  // CARD_MOVED_TO_COLUMN exige coluna de destino.
  if (parsed.data.trigger === "CARD_MOVED_TO_COLUMN" && !parsed.data.triggerColumnId) {
    return { error: "Escolha a coluna de destino do gatilho." };
  }

  // A coluna do gatilho (se houver) precisa pertencer ao quadro.
  if (parsed.data.triggerColumnId) {
    const col = await prisma.column.findFirst({
      where: { id: parsed.data.triggerColumnId, boardId },
    });
    if (!col) return { error: "Coluna do gatilho inválida." };
  }

  // Ações "criar card" só podem apontar para quadros DA MESMA organização
  // (limite de tenancy) e a coluna precisa pertencer ao quadro alvo.
  for (const action of parsed.data.actions) {
    if (action.type !== "CREATE_CARD") continue;
    const targetCol = await prisma.column.findFirst({
      where: { id: action.columnId, boardId: action.boardId },
      include: { board: { select: { organizationId: true, archivedAt: true } } },
    });
    if (
      !targetCol ||
      targetCol.board.archivedAt ||
      targetCol.board.organizationId !== board.organizationId
    ) {
      return { error: "Quadro/coluna de destino inválido para esta organização." };
    }
  }

  await prisma.automation.create({
    data: {
      boardId,
      name: parsed.data.name,
      trigger: parsed.data.trigger,
      triggerColumnId: parsed.data.triggerColumnId ?? null,
      actions: parsed.data.actions as unknown as Prisma.InputJsonValue,
    },
  });

  revalidatePath(settingsPath(board.organization.slug, boardId));
  return { ok: true };
}

export async function toggleAutomation(automationId: string): Promise<void> {
  const automation = await prisma.automation.findUnique({
    where: { id: automationId },
  });
  if (!automation) return;
  const { board } = await requireBoardManage(automation.boardId);

  await prisma.automation.update({
    where: { id: automationId },
    data: { enabled: !automation.enabled },
  });
  revalidatePath(settingsPath(board.organization.slug, automation.boardId));
}

export async function deleteAutomation(automationId: string): Promise<void> {
  const automation = await prisma.automation.findUnique({
    where: { id: automationId },
  });
  if (!automation) return;
  const { board } = await requireBoardManage(automation.boardId);

  await prisma.automation.delete({ where: { id: automationId } });
  revalidatePath(settingsPath(board.organization.slug, automation.boardId));
}
