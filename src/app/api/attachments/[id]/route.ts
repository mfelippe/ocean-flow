import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { readUpload } from "@/lib/storage";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Não autenticado", { status: 401 });
  }

  const attachment = await prisma.attachment.findUnique({
    where: { id },
    include: { card: { include: { column: true } } },
  });
  if (!attachment) {
    return new NextResponse("Não encontrado", { status: 404 });
  }

  // Autorização: o usuário precisa ser membro da organização dona do quadro.
  const board = await prisma.board.findUnique({
    where: { id: attachment.card.column.boardId },
    select: { organizationId: true },
  });
  if (!board) {
    return new NextResponse("Não encontrado", { status: 404 });
  }
  const membership = await prisma.membership.findUnique({
    where: {
      userId_organizationId: {
        userId: session.user.id,
        organizationId: board.organizationId,
      },
    },
  });
  if (!membership) {
    return new NextResponse("Sem acesso", { status: 403 });
  }

  let data: Buffer;
  try {
    data = await readUpload(attachment.filePath);
  } catch {
    return new NextResponse("Arquivo indisponível", { status: 404 });
  }

  const encodedName = encodeURIComponent(attachment.fileName);
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": attachment.mimeType,
      "Content-Disposition": `inline; filename*=UTF-8''${encodedName}`,
      "Content-Length": String(attachment.size),
      "Cache-Control": "private, max-age=3600",
    },
  });
}
