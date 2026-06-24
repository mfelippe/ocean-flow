import Link from "next/link";
import { MCP_TOOLS } from "@/lib/mcp";

// Documentação pública e navegável do servidor MCP, gerada a partir de
// MCP_TOOLS (fonte única — nunca desatualiza). Análogo humano do /api-docs.
export const metadata = { title: "Ocean Flow — MCP" };

const CONFIG_SNIPPET = `{
  "mcpServers": {
    "ocean-flow": {
      "type": "http",
      "url": "https://seu-host/api/mcp",
      "headers": { "Authorization": "Bearer <SEU_TOKEN>" }
    }
  }
}`;

function params(schema: { properties: Record<string, { type: string; description?: string }>; required?: string[] }) {
  const required = new Set(schema.required ?? []);
  return Object.entries(schema.properties).map(([name, p]) => ({
    name,
    type: p.type,
    description: p.description,
    required: required.has(name),
  }));
}

export default function McpDocsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-sm text-muted hover:text-brand">
          ← Ocean Flow
        </Link>
        <Link href="/api-docs" className="text-sm text-brand hover:underline">
          API REST (/api-docs) →
        </Link>
      </div>

      <h1 className="mt-4 text-2xl font-bold">Servidor MCP</h1>
      <p className="mt-1 text-sm text-muted">
        Conecte agentes de IA (Claude e outros clientes MCP) aos seus quadros.
        Transporte JSON-RPC 2.0 em <code className="rounded bg-edge px-1">POST /api/mcp</code>,
        autenticado pelo mesmo token de API.
      </p>

      <section className="mt-8">
        <h2 className="mb-2 text-sm font-semibold text-ink">Como conectar</h2>
        <p className="mb-2 text-xs text-muted">
          Crie um token em Integrações e configure seu cliente MCP. Exemplo
          (Claude Code / Desktop):
        </p>
        <pre className="overflow-x-auto rounded-xl border border-edge bg-panel/60 p-4 text-xs text-ink">
          <code>{CONFIG_SNIPPET}</code>
        </pre>
        <p className="mt-2 text-xs text-subtle">
          O cliente faz o handshake (<code>initialize</code>), descobre as
          ferramentas (<code>tools/list</code>) e as executa (<code>tools/call</code>).
          Toda a comunicação é escopada à organização do token.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="mb-1 text-sm font-semibold text-ink">
          Ferramentas ({MCP_TOOLS.length})
        </h2>
        <p className="mb-3 text-xs text-muted">
          Lista viva — é exatamente o que <code className="rounded bg-edge px-1">tools/list</code>{" "}
          retorna ao seu cliente.
        </p>

        <ul className="space-y-3">
          {MCP_TOOLS.map((tool) => {
            const ps = params(tool.inputSchema);
            return (
              <li
                key={tool.name}
                className="rounded-xl border border-edge bg-panel/60 p-4"
              >
                <div className="flex items-baseline gap-2">
                  <code className="text-sm font-semibold text-brand">{tool.name}</code>
                </div>
                <p className="mt-1 text-sm text-ink">{tool.description}</p>
                {ps.length > 0 ? (
                  <table className="mt-3 w-full text-left text-xs">
                    <thead className="text-subtle">
                      <tr>
                        <th className="pb-1 pr-4 font-medium">Parâmetro</th>
                        <th className="pb-1 pr-4 font-medium">Tipo</th>
                        <th className="pb-1 font-medium">Obrigatório</th>
                      </tr>
                    </thead>
                    <tbody className="text-muted">
                      {ps.map((p) => (
                        <tr key={p.name} className="border-t border-edge/60">
                          <td className="py-1 pr-4">
                            <code className="text-ink">{p.name}</code>
                            {p.description && (
                              <span className="ml-1 text-subtle">— {p.description}</span>
                            )}
                          </td>
                          <td className="py-1 pr-4">{p.type}</td>
                          <td className="py-1">{p.required ? "sim" : "não"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="mt-2 text-xs text-subtle">Sem parâmetros.</p>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <p className="mt-8 text-xs text-subtle">
        Referência completa (handshake, exemplos via curl, formato de resposta) em{" "}
        <code className="rounded bg-edge px-1">docs/MCP.md</code> no repositório.
      </p>
    </main>
  );
}
