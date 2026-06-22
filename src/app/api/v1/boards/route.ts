import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiToken } from "@/lib/api-auth";

export async function GET(request: Request) {
  const auth = await requireApiToken(request);
  if (auth instanceof NextResponse) return auth;

  const boards = await prisma.board.findMany({
    where: { organizationId: auth.organizationId, archivedAt: null },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, description: true, createdAt: true },
  });
  return NextResponse.json({ boards });
}
