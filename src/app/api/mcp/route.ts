import { NextResponse } from "next/server";
import { authenticateApiToken } from "@/lib/api-auth";
import { MCP_TOOLS, callTool } from "@/lib/mcp";

const PROTOCOL_VERSION = "2025-06-18";
const SERVER_INFO = { name: "ocean-flow", version: "0.1.0" };

function rpcError(id: unknown, code: number, message: string) {
  return NextResponse.json({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });
}

export async function POST(request: Request) {
  const auth = await authenticateApiToken(request);
  if (!auth) {
    return NextResponse.json(
      { jsonrpc: "2.0", id: null, error: { code: -32001, message: "Token de API inválido ou ausente." } },
      { status: 401 },
    );
  }

  let message: { id?: unknown; method?: string; params?: Record<string, unknown> };
  try {
    message = await request.json();
  } catch {
    return rpcError(null, -32700, "Parse error");
  }

  const { id, method, params } = message;

  // Notificações (sem id) não têm resposta.
  if (id === undefined || id === null) {
    return new NextResponse(null, { status: 202 });
  }

  switch (method) {
    case "initialize":
      return NextResponse.json({
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion:
            (params?.protocolVersion as string) ?? PROTOCOL_VERSION,
          capabilities: { tools: {} },
          serverInfo: SERVER_INFO,
        },
      });

    case "ping":
      return NextResponse.json({ jsonrpc: "2.0", id, result: {} });

    case "tools/list":
      return NextResponse.json({
        jsonrpc: "2.0",
        id,
        result: { tools: MCP_TOOLS },
      });

    case "tools/call": {
      const name = String(params?.name ?? "");
      const args = (params?.arguments as Record<string, unknown>) ?? {};
      const result = await callTool(auth.organizationId, name, args);
      return NextResponse.json({ jsonrpc: "2.0", id, result });
    }

    default:
      return rpcError(id, -32601, `Method not found: ${method}`);
  }
}

// Servidor stateless: não mantém stream SSE iniciado pelo cliente.
export async function GET() {
  return new NextResponse("MCP via POST (JSON-RPC). Use Authorization: Bearer <token>.", {
    status: 405,
  });
}
