# Servidor MCP

O Ocean Flow expõe um servidor **MCP (Model Context Protocol)** via HTTP, para
que agentes de IA (Claude e outros clientes MCP) interajam com seus quadros.

- **Endpoint:** `POST /api/mcp`
- **Transporte:** JSON-RPC 2.0 stateless (sem SSE/sessão)
- **Autenticação:** `Authorization: Bearer <token>` — o **mesmo token de API**
  (veja [API.md](API.md)); o token escopa o acesso à sua organização.

## Conectando um cliente

Configure o cliente MCP com a URL `https://seu-host/api/mcp` e o header
`Authorization: Bearer <token>`. O servidor responde ao handshake
(`initialize`), lista as ferramentas (`tools/list`) e as executa (`tools/call`).

## Ferramentas

| Ferramenta    | Argumentos                                  | Descrição                          |
| ------------- | ------------------------------------------- | ---------------------------------- |
| `list_boards` | —                                           | Lista os quadros da organização    |
| `get_board`   | `boardId`                                   | Quadro com colunas e cards         |
| `create_card` | `boardId`, `columnId`, `title`, `description?` | Cria um card                   |
| `move_card`   | `cardId`, `columnId`                        | Move o card para outra coluna      |
| `add_comment` | `cardId`, `body`                            | Comenta num card                   |

As ações disparam atividade e **webhooks** (payload com `via: "mcp"`).

## Exemplo (cru, via curl)

Handshake:

```bash
curl -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"curl","version":"1"}}}' \
  https://seu-host/api/mcp
```

Listar ferramentas:

```bash
curl -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' \
  https://seu-host/api/mcp
```

Chamar uma ferramenta:

```bash
curl -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"create_card","arguments":{"boardId":"...","columnId":"...","title":"via MCP"}}}' \
  https://seu-host/api/mcp
```

O resultado de uma tool vem em `result.content[0].text` (JSON serializado).
Erros de ferramenta retornam `result.isError = true` com a mensagem; erros de
protocolo seguem o formato de erro JSON-RPC.
