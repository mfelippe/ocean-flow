import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";

const PREFIX = "ofw_";

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

/** Gera um token de API. Retorna o valor em claro (mostrado uma única vez)
 *  e os campos a persistir (hash + prefixo para exibição). */
export function generateApiToken(): {
  token: string;
  tokenHash: string;
  prefix: string;
} {
  const token = PREFIX + crypto.randomBytes(24).toString("hex");
  return { token, tokenHash: sha256(token), prefix: token.slice(0, 12) };
}

/**
 * Autentica uma requisição da API pública pelo header Authorization: Bearer.
 * Retorna a organização do token (ou null). Atualiza lastUsedAt.
 */
export async function authenticateApiToken(
  request: Request,
): Promise<{ organizationId: string; tokenId: string } | null> {
  const header = request.headers.get("authorization") ?? "";
  if (!header.startsWith("Bearer ")) return null;

  const raw = header.slice(7).trim();
  if (!raw) return null;

  const token = await prisma.apiToken.findUnique({
    where: { tokenHash: sha256(raw) },
  });
  if (!token) return null;

  await prisma.apiToken
    .update({ where: { id: token.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});

  return { organizationId: token.organizationId, tokenId: token.id };
}

export function jsonError(status: number, message: string): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Aplica o rate limit ao token. Retorna `null` se ok, ou uma resposta `429`
 * pronta (com headers de rate limit) se o orçamento estourou.
 */
export function enforceRateLimit(tokenId: string): NextResponse | null {
  const result = checkRateLimit(`token:${tokenId}`);
  if (result.ok) return null;
  return NextResponse.json(
    { error: "Limite de requisições excedido. Tente novamente em instantes." },
    { status: 429, headers: rateLimitHeaders(result) },
  );
}

/** Autentica, aplica rate limit e retorna a org — ou uma resposta 401/429. */
export async function requireApiToken(
  request: Request,
): Promise<{ organizationId: string; tokenId: string } | NextResponse> {
  const auth = await authenticateApiToken(request);
  if (!auth) return jsonError(401, "Token de API inválido ou ausente.");
  const limited = enforceRateLimit(auth.tokenId);
  if (limited) return limited;
  return auth;
}
