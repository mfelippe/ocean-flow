import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Health check: usado pelo Docker e por monitores externos (estilo Uptime Kuma).
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", db: "up" });
  } catch {
    return NextResponse.json(
      { status: "error", db: "down" },
      { status: 503 },
    );
  }
}
