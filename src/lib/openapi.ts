/**
 * Documento OpenAPI 3.1 da API pública (`/api/v1`). Escrito à mão (sem libs)
 * e servido em `/api/openapi.json`; renderizado em `/api-docs`.
 * Mantenha em sincronia com as rotas em `src/app/api/v1/**` e docs/API.md.
 */

const errorResponse = {
  description: "Erro",
  content: {
    "application/json": {
      schema: { $ref: "#/components/schemas/Error" },
    },
  },
};

export function getOpenApiDocument() {
  return {
    openapi: "3.1.0",
    info: {
      title: "Ocean Flow — API pública",
      version: "1.0.0",
      description:
        "Leia e manipule quadros e cards programaticamente.\n\n" +
        "**Autenticação:** envie `Authorization: Bearer <token>`. Os tokens são " +
        "criados em Integrações (`/orgs/<slug>/settings`). Cada token dá acesso à " +
        "organização que o gerou.\n\n" +
        "**Rate limit:** por padrão 120 requisições por minuto por token " +
        "(configurável na instância). Ao exceder, a API responde `429` com os " +
        "headers `X-RateLimit-*` e `Retry-After`.",
    },
    servers: [{ url: "/", description: "Esta instância" }],
    tags: [
      { name: "Organização" },
      { name: "Quadros" },
      { name: "Cards" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", description: "Token de API" },
      },
      schemas: {
        Error: {
          type: "object",
          properties: { error: { type: "string" } },
          required: ["error"],
        },
        Organization: {
          type: "object",
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            slug: { type: "string" },
          },
        },
        Card: {
          type: "object",
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            description: { type: ["string", "null"] },
            dueDate: { type: ["string", "null"], format: "date-time" },
            columnId: { type: "string" },
          },
        },
        CardFull: {
          type: "object",
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            description: { type: ["string", "null"] },
            dueDate: { type: ["string", "null"], format: "date-time" },
            archivedAt: { type: ["string", "null"], format: "date-time" },
            createdAt: { type: "string", format: "date-time" },
            boardId: { type: "string" },
            column: {
              type: "object",
              properties: { id: { type: "string" }, name: { type: "string" } },
            },
            labels: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  name: { type: "string" },
                  color: { type: "string" },
                },
              },
            },
            comments: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  body: { type: "string" },
                  author: { type: ["string", "null"] },
                  createdAt: { type: "string", format: "date-time" },
                },
              },
            },
            attachments: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  fileName: { type: "string" },
                  mimeType: { type: "string" },
                  size: { type: "integer" },
                },
              },
            },
            fields: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  name: { type: "string" },
                  type: { type: "string", enum: ["TEXT", "NUMBER", "DATE"] },
                  value: { type: ["string", "null"] },
                },
              },
            },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    paths: {
      "/api/v1/me": {
        get: {
          tags: ["Organização"],
          summary: "Organização do token",
          responses: {
            "200": {
              description: "OK",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: { organization: { $ref: "#/components/schemas/Organization" } },
                  },
                },
              },
            },
            "401": errorResponse,
            "429": errorResponse,
          },
        },
      },
      "/api/v1/boards": {
        get: {
          tags: ["Quadros"],
          summary: "Lista os quadros da organização",
          responses: {
            "200": {
              description: "OK",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      boards: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            id: { type: "string" },
                            name: { type: "string" },
                            description: { type: ["string", "null"] },
                            createdAt: { type: "string", format: "date-time" },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            "401": errorResponse,
            "429": errorResponse,
          },
        },
      },
      "/api/v1/boards/{boardId}": {
        get: {
          tags: ["Quadros"],
          summary: "Quadro com colunas e cards",
          parameters: [
            { name: "boardId", in: "path", required: true, schema: { type: "string" } },
          ],
          responses: {
            "200": { description: "OK" },
            "401": errorResponse,
            "404": errorResponse,
            "429": errorResponse,
          },
        },
      },
      "/api/v1/boards/{boardId}/cards": {
        post: {
          tags: ["Cards"],
          summary: "Cria um card numa coluna do quadro",
          parameters: [
            { name: "boardId", in: "path", required: true, schema: { type: "string" } },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["columnId", "title"],
                  properties: {
                    columnId: { type: "string" },
                    title: { type: "string" },
                    description: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            "201": {
              description: "Criado",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: { card: { $ref: "#/components/schemas/Card" } },
                  },
                },
              },
            },
            "400": errorResponse,
            "401": errorResponse,
            "404": errorResponse,
            "429": errorResponse,
          },
        },
      },
      "/api/v1/cards/{cardId}": {
        get: {
          tags: ["Cards"],
          summary: "Dados completos de um card",
          parameters: [
            { name: "cardId", in: "path", required: true, schema: { type: "string" } },
          ],
          responses: {
            "200": {
              description: "OK",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: { card: { $ref: "#/components/schemas/CardFull" } },
                  },
                },
              },
            },
            "401": errorResponse,
            "404": errorResponse,
            "429": errorResponse,
          },
        },
        patch: {
          tags: ["Cards"],
          summary: "Atualiza/move um card (campos parciais)",
          parameters: [
            { name: "cardId", in: "path", required: true, schema: { type: "string" } },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    description: { type: ["string", "null"] },
                    dueDate: { type: ["string", "null"], description: "data ISO (ex.: 2026-08-01)" },
                    columnId: { type: "string", description: "move para esta coluna do mesmo quadro" },
                    fields: {
                      type: "object",
                      additionalProperties: { type: "string" },
                      description: "mapa fieldId → valor (campos personalizados; \"\" limpa)",
                    },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "OK",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: { card: { $ref: "#/components/schemas/Card" } },
                  },
                },
              },
            },
            "400": errorResponse,
            "401": errorResponse,
            "404": errorResponse,
            "429": errorResponse,
          },
        },
      },
      "/api/v1/cards/{cardId}/comments": {
        post: {
          tags: ["Cards"],
          summary: "Adiciona um comentário ao card",
          parameters: [
            { name: "cardId", in: "path", required: true, schema: { type: "string" } },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["body"],
                  properties: { body: { type: "string" } },
                },
              },
            },
          },
          responses: {
            "201": { description: "Criado" },
            "400": errorResponse,
            "401": errorResponse,
            "404": errorResponse,
            "429": errorResponse,
          },
        },
      },
    },
  };
}
