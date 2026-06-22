import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiToken } from "@/lib/api-auth";

export async function GET(request: Request) {
  const auth = await requireApiToken(request);
  if (auth instanceof NextResponse) return auth;

  const organization = await prisma.organization.findUnique({
    where: { id: auth.organizationId },
    select: { id: true, name: true, slug: true },
  });
  return NextResponse.json({ organization });
}
