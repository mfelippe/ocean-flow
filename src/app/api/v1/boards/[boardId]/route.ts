import { NextResponse } from "next/server";
import { jsonError, requireApiToken } from "@/lib/api-auth";
import { opGetBoard } from "@/lib/kanban-ops";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ boardId: string }> },
) {
  const auth = await requireApiToken(request);
  if (auth instanceof NextResponse) return auth;
  const { boardId } = await params;

  try {
    return NextResponse.json(await opGetBoard(auth.organizationId, boardId));
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao buscar o quadro.";
    return jsonError(msg.includes("não encontrado") ? 404 : 400, msg);
  }
}
