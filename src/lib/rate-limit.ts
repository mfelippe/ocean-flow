/**
 * Rate limiter in-memory (janela fixa), sem dependências externas — adequado
 * para o cenário self-hosted single-instance. Em deploy com múltiplas
 * instâncias o limite passa a ser POR INSTÂNCIA (documentado em docs/API.md).
 *
 * Configurável por env:
 *   API_RATE_LIMIT           nº de requisições por janela (default 120; 0 = desliga)
 *   API_RATE_WINDOW_SECONDS  tamanho da janela em segundos (default 60)
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 50_000; // trava de segurança contra crescimento ilimitado

function config(): { limit: number; windowMs: number } {
  const limit = Number(process.env.API_RATE_LIMIT ?? 120);
  const windowSeconds = Number(process.env.API_RATE_WINDOW_SECONDS ?? 60);
  return {
    limit: Number.isFinite(limit) ? limit : 120,
    windowMs: (Number.isFinite(windowSeconds) ? windowSeconds : 60) * 1000,
  };
}

export type RateLimitResult = {
  ok: boolean;
  limit: number;
  remaining: number;
  resetAt: number; // epoch ms
  retryAfter: number; // segundos até liberar
};

/** Consome 1 do orçamento da `key`. `limit <= 0` desliga (sempre ok). */
export function checkRateLimit(key: string): RateLimitResult {
  const { limit, windowMs } = config();
  const now = Date.now();

  if (limit <= 0) {
    return { ok: true, limit: 0, remaining: 0, resetAt: now, retryAfter: 0 };
  }

  let bucket = buckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }
  bucket.count += 1;

  const remaining = Math.max(0, limit - bucket.count);
  const retryAfter = bucket.count > limit
    ? Math.ceil((bucket.resetAt - now) / 1000)
    : 0;

  if (buckets.size > MAX_BUCKETS) sweep(now);

  return { ok: bucket.count <= limit, limit, remaining, resetAt: bucket.resetAt, retryAfter };
}

/** Headers padrão de rate limit para anexar à resposta. */
export function rateLimitHeaders(r: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(r.limit),
    "X-RateLimit-Remaining": String(r.remaining),
    "X-RateLimit-Reset": String(Math.ceil(r.resetAt / 1000)),
  };
  if (!r.ok) headers["Retry-After"] = String(r.retryAfter);
  return headers;
}

/** Remove buckets expirados (chamado quando o mapa cresce demais). */
function sweep(now: number): void {
  for (const [key, bucket] of buckets) {
    if (now >= bucket.resetAt) buckets.delete(key);
  }
}
