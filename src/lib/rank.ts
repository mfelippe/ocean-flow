import { generateKeyBetween } from "fractional-indexing";

/**
 * Calcula um rank fracionário entre dois vizinhos (ordenação de colunas/cards).
 * Passe null para indicar "início" (a=null) ou "fim" (b=null) da lista.
 * Mover um item grava apenas a linha movida — nunca reindexa a lista.
 */
export function rankBetween(
  before: string | null,
  after: string | null,
): string {
  return generateKeyBetween(before, after);
}
