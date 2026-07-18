import { NextResponse } from "next/server";
import { jsonError, requireApiToken } from "@/lib/api-auth";
import { opCreateCard } from "@/lib/kanban-ops";
import { apiCardCreateSchema } from "@/lib/validations";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ boardId: string }> },
) {
  const auth = await requireApiToken(request);
  if (auth instanceof NextResponse) return auth;
  const { boardId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "Corpo JSON inválido.");
  }

  const parsed = apiCardCreateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  try {
    const result = await opCreateCard(auth.organizationId, {
      boardId,
      columnId: parsed.data.columnId,
      title: parsed.data.title,
      description: parsed.data.description || undefined,
      fields: parsed.data.fields,
      via: "api",
    });
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao criar o card.";
    // "Quadro não encontrado." → 404 (mesmo padrão dos outros handlers);
    // demais mensagens de validação (columnId, fields) → 400.
    const status = msg.includes("não encontrado") ? 404 : 400;
    return jsonError(status, msg);
  }
}
