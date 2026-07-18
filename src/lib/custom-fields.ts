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
 * Fluxo idêntico ao do PATCH: ids fora do quadro são ignorados; valores
 * inválidos retornam `{ error }` já formatado (`"NomeDoCampo: mensagem"`);
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

  for (const [fieldId, raw] of Object.entries(fields)) {
    const field = byId.get(fieldId);
    if (!field) continue; // ignora ids fora do quadro (compat com PATCH atual)
    const norm = normalizeFieldValue(field.type, raw);
    if ("error" in norm) return { error: `${field.name}: ${norm.error}` };
    if (norm.value === "") {
      await db.cardFieldValue.deleteMany({ where: { cardId, fieldId } });
    } else {
      await db.cardFieldValue.upsert({
        where: { cardId_fieldId: { cardId, fieldId } },
        update: { value: norm.value },
        create: { cardId, fieldId, value: norm.value },
      });
    }
  }
  return {};
}
