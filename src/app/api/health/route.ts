import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Versão e commit assados na imagem no build (ver Dockerfile + workflow de
// publish). Em dev, sem essas envs, cai para "dev"/null.
const version = process.env.APP_VERSION || "dev";
const commit = process.env.GIT_SHA ? process.env.GIT_SHA.slice(0, 7) : null;

// Health check: usado pelo Docker e por monitores externos (estilo Uptime Kuma).
// Expõe também a versão instalada, para conferir o que está no ar sem depender
// da tag `:latest` da imagem.
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", db: "up", version, commit });
  } catch {
    return NextResponse.json(
      { status: "error", db: "down", version, commit },
      { status: 503 },
    );
  }
}
