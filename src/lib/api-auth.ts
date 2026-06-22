import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
): Promise<{ organizationId: string } | null> {
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

  return { organizationId: token.organizationId };
}

export function jsonError(status: number, message: string): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

/** Autentica e retorna a org, ou uma resposta 401 pronta. */
export async function requireApiToken(
  request: Request,
): Promise<{ organizationId: string } | NextResponse> {
  const auth = await authenticateApiToken(request);
  if (!auth) return jsonError(401, "Token de API inválido ou ausente.");
  return auth;
}
