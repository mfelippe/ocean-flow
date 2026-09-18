import type { CustomFieldType, Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Normaliza/valida o valor de um campo personalizado conforme o tipo.
 * Valor vazio significa "limpar" (remover o valor).
 */
export function normalizeFieldValue(
  type: CustomFieldType,
  raw: unknown,
): { value: string } | { error: string } {
  const v = typeof raw === "string" ? raw.trim() : "";
  if (v === "") return { value: "" };

  if (type === "NUMBER") {
    if (!/^-?\d+(\.\d+)?$/.test(v)) return { error: "Valor numérico inválido." };
    return { value: v };
  }
  if (type === "DATE") {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return { error: "Data inválida (use AAAA-MM-DD)." };
    return { value: v.slice(0, 10) };
  }
  return { value: v }; // TEXT
}

/** Tipo de input HTML por tipo de campo. */
export function inputTypeFor(type: CustomFieldType): string {
  if (type === "NUMBER") return "number";
  if (type === "DATE") return "date";
  return "text";
}

type FieldsClient = PrismaClient | Prisma.TransactionClient;

/**
 * Aplica um mapa `fieldId → valor` de campos personalizados a um card.
 * Valida tudo antes de gravar (nada de escrita parcial): um `fieldId` que
 * não pertence ao quadro retorna `{ error }` — evita a perda silenciosa em
 * que o valor era descartado e o card voltava com o campo vazio. Valores
 * inválidos retornam `{ error }` formatado (`"NomeDoCampo: mensagem"`);
 * valores vazios apagam a linha, senão faz `upsert`.
 *
 * Passe `client` (um `Prisma.TransactionClient`) para rodar dentro de uma
 * transação — usado no create para permitir rollback do card em caso de erro.
 */
export async function applyCardFields(
  cardId: string,
  boardId: string,
  fields: Record<string, string>,
  client?: FieldsClient,
): Promise<{ error?: string }> {
  const db = client ?? prisma;
  const boardFields = await db.customField.findMany({ where: { boardId } });
  const byId = new Map(boardFields.map((f) => [f.id, f]));

  // Valida todos os ids/valores antes de gravar, para não deixar escrita
  // parcial quando um id posterior for inválido (o PATCH não roda em transação).
  const writes: { fieldId: string; value: string }[] = [];
  for (const [fieldId, raw] of Object.entries(fields)) {
    const field = byId.get(fieldId);
    if (!field) {
      return { error: `Campo personalizado "${fieldId}" não pertence a este quadro.` };
    }
    const norm = normalizeFieldValue(field.type, raw);
    if ("error" in norm) return { error: `${field.name}: ${norm.error}` };
    writes.push({ fieldId, value: norm.value });
  }

  for (const { fieldId, value } of writes) {
    if (value === "") {
      await db.cardFieldValue.deleteMany({ where: { cardId, fieldId } });
    } else {
      await db.cardFieldValue.upsert({
        where: { cardId_fieldId: { cardId, fieldId } },
        update: { value },
        create: { cardId, fieldId, value },
      });
    }
  }
  return {};
}
