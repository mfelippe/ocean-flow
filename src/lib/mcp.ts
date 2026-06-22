import {
  opAddComment,
  opCreateCard,
  opGetBoard,
  opListBoards,
  opMoveCard,
} from "@/lib/kanban-ops";

type JsonSchema = {
  type: "object";
  properties: Record<string, { type: string; description?: string }>;
  required?: string[];
};

type ToolDef = {
  name: string;
  description: string;
  inputSchema: JsonSchema;
};

export const MCP_TOOLS: ToolDef[] = [
  {
    name: "list_boards",
    description: "Lista os quadros da organização.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_board",
    description: "Retorna um quadro com suas colunas e cards.",
    inputSchema: {
      type: "object",
      properties: { boardId: { type: "string", description: "ID do quadro" } },
      required: ["boardId"],
    },
  },
  {
    name: "create_card",
    description: "Cria um card numa coluna de um quadro.",
    inputSchema: {
      type: "object",
      properties: {
        boardId: { type: "string" },
        columnId: { type: "string" },
        title: { type: "string" },
        description: { type: "string" },
      },
      required: ["boardId", "columnId", "title"],
    },
  },
  {
    name: "move_card",
    description: "Move um card para outra coluna do mesmo quadro.",
    inputSchema: {
      type: "object",
      properties: {
        cardId: { type: "string" },
        columnId: { type: "string", description: "Coluna de destino" },
      },
      required: ["cardId", "columnId"],
    },
  },
  {
    name: "add_comment",
    description: "Adiciona um comentário a um card.",
    inputSchema: {
      type: "object",
      properties: {
        cardId: { type: "string" },
        body: { type: "string" },
      },
      required: ["cardId", "body"],
    },
  },
];

type ToolResult = {
  content: { type: "text"; text: string }[];
  isError?: boolean;
};

function ok(data: unknown): ToolResult {
  return { content: [{ type: "text", text: JSON.stringify(data) }] };
}
function fail(message: string): ToolResult {
  return { content: [{ type: "text", text: message }], isError: true };
}

function str(args: Record<string, unknown>, key: string): string {
  const v = args[key];
  return typeof v === "string" ? v.trim() : "";
}

/** Executa uma tool MCP escopada à organização do token. */
export async function callTool(
  organizationId: string,
  name: string,
  args: Record<string, unknown>,
): Promise<ToolResult> {
  try {
    switch (name) {
      case "list_boards":
        return ok(await opListBoards(organizationId));

      case "get_board": {
        const boardId = str(args, "boardId");
        if (!boardId) return fail("boardId é obrigatório.");
        return ok(await opGetBoard(organizationId, boardId));
      }

      case "create_card": {
        const boardId = str(args, "boardId");
        const columnId = str(args, "columnId");
        const title = str(args, "title");
        if (!boardId || !columnId || !title) {
          return fail("boardId, columnId e title são obrigatórios.");
        }
        return ok(
          await opCreateCard(organizationId, {
            boardId,
            columnId,
            title,
            description: str(args, "description") || undefined,
          }),
        );
      }

      case "move_card": {
        const cardId = str(args, "cardId");
        const columnId = str(args, "columnId");
        if (!cardId || !columnId) {
          return fail("cardId e columnId são obrigatórios.");
        }
        return ok(await opMoveCard(organizationId, { cardId, columnId }));
      }

      case "add_comment": {
        const cardId = str(args, "cardId");
        const body = str(args, "body");
        if (!cardId || !body) return fail("cardId e body são obrigatórios.");
        return ok(await opAddComment(organizationId, { cardId, body }));
      }

      default:
        return fail(`Ferramenta desconhecida: ${name}`);
    }
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Erro ao executar a ferramenta.");
  }
}
