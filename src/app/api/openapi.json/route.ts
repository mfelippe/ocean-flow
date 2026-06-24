import { NextResponse } from "next/server";
import { getOpenApiDocument } from "@/lib/openapi";

// Spec OpenAPI pública (sem autenticação) — consumida pela página /api-docs
// e por geradores de cliente. Não expõe dados, só o contrato da API.
export function GET() {
  return NextResponse.json(getOpenApiDocument());
}
