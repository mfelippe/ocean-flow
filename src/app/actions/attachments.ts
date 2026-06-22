"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireBoardWrite } from "@/lib/authz";
import { logActivity } from "@/lib/activity";
import { MAX_UPLOAD_BYTES, deleteUpload, saveUpload } from "@/lib/storage";

export type FormState = { error?: string; ok?: boolean } | undefined;

async function loadCard(cardId: string) {
  return prisma.card.findUnique({
    where: { id: cardId },
    include: {
      column: {
        include: {
          board: { include: { organization: { select: { slug: true } } } },
        },
      },
    },
  });
}

function revalidateCard(slug: string, boardId: string, cardId: string) {
  revalidatePath(`/orgs/${slug}/boards/${boardId}`);
  revalidatePath(`/orgs/${slug}/boards/${boardId}/cards/${cardId}`);
}

export async function uploadAttachment(
  cardId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const card = await loadCard(cardId);
  if (!card) return { error: "Card não encontrado." };
  const { user } = await requireBoardWrite(card.column.boardId);

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecione um arquivo." };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { error: "Arquivo muito grande (máximo 10 MB)." };
  }

  const { storedName, size } = await saveUpload(file);

  await prisma.attachment.create({
    data: {
      cardId,
      fileName: file.name.slice(0, 255),
      filePath: storedName,
      mimeType: file.type || "application/octet-stream",
      size,
    },
  });
  await logActivity({
    boardId: card.column.boardId,
    cardId,
    actorId: user.id,
    type: "ATTACHMENT_ADDED",
    payload: { name: file.name },
  });

  revalidateCard(card.column.board.organization.slug, card.column.boardId, cardId);
  return { ok: true };
}

export async function deleteAttachment(attachmentId: string): Promise<void> {
  const attachment = await prisma.attachment.findUnique({
    where: { id: attachmentId },
    include: {
      card: {
        include: {
          column: {
            include: {
              board: { include: { organization: { select: { slug: true } } } },
            },
          },
        },
      },
    },
  });
  if (!attachment) return;
  await requireBoardWrite(attachment.card.column.boardId);

  await prisma.attachment.delete({ where: { id: attachmentId } });
  await deleteUpload(attachment.filePath);

  revalidateCard(
    attachment.card.column.board.organization.slug,
    attachment.card.column.boardId,
    attachment.cardId,
  );
}
