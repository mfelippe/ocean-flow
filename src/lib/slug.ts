import { prisma } from "@/lib/prisma";

/** Converte um texto livre em slug (minúsculo, sem acentos, hifenizado). */
export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove diacríticos combinantes (acentos)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

/** Gera um slug único para Organization, anexando sufixo numérico se preciso. */
export async function uniqueOrgSlug(name: string): Promise<string> {
  const base = slugify(name) || "org";
  let candidate = base;
  let suffix = 1;
  while (await prisma.organization.findUnique({ where: { slug: candidate } })) {
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
  return candidate;
}
