import type { CustomFieldType } from "@prisma/client";

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
