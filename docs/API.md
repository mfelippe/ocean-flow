# API REST pública

A API permite ler e manipular quadros e cards programaticamente. Base: `/api/v1`.

> **Documentação interativa:** acesse **`/api-docs`** na sua instância para
> explorar todas as rotas e testá-las no navegador (cole o token em
> _Authorize_). A spec OpenAPI fica em **`/api/openapi.json`**.

## Autenticação

Todas as rotas exigem um **token de API** no header:

```
Authorization: Bearer <token>
```

Os tokens são criados em **Integrações** (`/orgs/<slug>/settings`, por
OWNER/ADMIN). O valor em claro é exibido **uma única vez** na criação — guarde-o.
Cada token dá acesso à **organização** que o gerou.

Sem token válido, as rotas respondem `401`.

## Rate limit

Cada token tem um limite de requisições por janela de tempo (padrão:
**120 req/min**). Ao exceder, a API responde `429` com:

| Header | Significado |
| ------ | ----------- |
| `X-RateLimit-Limit` | limite por janela |
| `X-RateLimit-Remaining` | requisições restantes na janela |
| `X-RateLimit-Reset` | epoch (s) em que a janela reinicia |
| `Retry-After` | segundos até liberar (apenas no `429`) |

Configurável na instância via `API_RATE_LIMIT` (req por janela; `0` desliga) e
`API_RATE_WINDOW_SECONDS` (tamanho da janela). O limite vale também para o
servidor MCP (`/api/mcp`). Em deploy com múltiplas instâncias, o controle é
por instância (in-memory).

## Endpoints

### `GET /api/v1/me`

Retorna a organização do token.

```bash
curl -H "Authorization: Bearer $TOKEN" https://seu-host/api/v1/me
```

```json
{ "organization": { "id": "...", "name": "Time Oceano", "slug": "time-oceano" } }
```

### `GET /api/v1/boards`

Lista os quadros da organização.

```json
{ "boards": [ { "id": "...", "name": "Exemplo", "description": null, "createdAt": "..." } ] }
```

### `GET /api/v1/boards/{boardId}`

Retorna um quadro com colunas e cards. `404` se o quadro não pertence à org do token.

```json
{
  "board": {
    "id": "...",
    "name": "Exemplo",
    "columns": [
      { "id": "col_1", "name": "A Fazer", "cards": [
        { "id": "card_1", "title": "Tarefa", "description": null, "dueDate": null }
      ] }
    ]
  }
}
```

### `POST /api/v1/boards/{boardId}/cards`

Cria um card numa coluna do quadro. Resposta `201`.

| Campo         | Tipo   | Obrigatório |
| ------------- | ------ | ----------- |
| `columnId`    | string | sim         |
| `title`       | string | sim         |
| `description` | string | não         |

```bash
curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"columnId":"col_1","title":"Nova tarefa","description":"detalhes"}' \
  https://seu-host/api/v1/boards/$BOARD_ID/cards
```

```json
{ "card": { "id": "...", "title": "Nova tarefa", "columnId": "col_1" } }
```

### `GET /api/v1/cards/{cardId}`

Retorna os dados completos de um card (descrição, prazo, labels, comentários e
anexos). `404` se o card não pertence à org do token.

```bash
curl -H "Authorization: Bearer $TOKEN" https://seu-host/api/v1/cards/$CARD_ID
```

```json
{
  "card": {
    "id": "...",
    "title": "Tarefa",
    "description": "## Detalhes…",
    "dueDate": "2026-08-01T00:00:00.000Z",
    "archivedAt": null,
    "createdAt": "...",
    "boardId": "...",
    "column": { "id": "col_1", "name": "A Fazer" },
    "labels": [ { "id": "...", "name": "Urgente", "color": "#ef4444" } ],
    "comments": [ { "id": "...", "body": "...", "author": "Fulano", "createdAt": "..." } ],
    "attachments": [ { "id": "...", "fileName": "doc.pdf", "mimeType": "application/pdf", "size": 12345 } ],
    "fields": [ { "id": "fld_1", "name": "Telefone", "type": "TEXT", "value": "5511999999999" } ]
  }
}
```

`fields` traz os **campos personalizados** do quadro com o valor do card
(`value: null` quando vazio) — úteis para integrações (ex.: telefone do WhatsApp).

### `PATCH /api/v1/cards/{cardId}`

Atualiza um card (campos parciais). Inclua `columnId` para **mover** o card para
outra coluna do mesmo quadro (vai para o fim da coluna destino).

| Campo         | Tipo            | Observação                     |
| ------------- | --------------- | ------------------------------ |
| `title`       | string          | não vazio                      |
| `description` | string ou null  |                                |
| `dueDate`     | string ou null  | data ISO (ex.: `2026-08-01`)   |
| `columnId`    | string          | move para esta coluna          |
| `fields`      | objeto          | mapa `fieldId → valor` (campos personalizados; `""` limpa) |

```bash
curl -X PATCH -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"columnId":"col_2","dueDate":"2026-08-01"}' \
  https://seu-host/api/v1/cards/$CARD_ID
```

### `POST /api/v1/cards/{cardId}/comments`

Adiciona um comentário. Resposta `201`.

```bash
curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"body":"comentário pela API"}' \
  https://seu-host/api/v1/cards/$CARD_ID/comments
```

## Códigos de erro

| Status | Significado                                  |
| ------ | -------------------------------------------- |
| `400`  | Corpo inválido / campo faltando / id inválido |
| `401`  | Token ausente ou inválido                    |
| `404`  | Recurso não pertence à organização do token  |
| `429`  | Rate limit excedido (veja `Retry-After`)     |

Erros retornam `{ "error": "mensagem" }`.

## Eventos

Toda escrita (criar/mover/atualizar card, comentar) registra atividade e
**dispara os webhooks** da organização. Veja [WEBHOOKS.md](WEBHOOKS.md).
