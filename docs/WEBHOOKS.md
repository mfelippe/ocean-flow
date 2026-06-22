# Webhooks

Webhooks notificam uma URL externa quando algo acontece num quadro da
organização. Configurados em **Integrações** (`/orgs/<slug>/settings`, por
OWNER/ADMIN), com escolha dos eventos e um **segredo** para verificar a origem.

## Eventos

| Evento             | Quando dispara              |
| ------------------ | --------------------------- |
| `CARD_CREATED`     | Card criado                 |
| `CARD_MOVED`       | Card movido de coluna       |
| `CARD_UPDATED`     | Card editado                |
| `CARD_ARCHIVED`    | Card arquivado              |
| `COMMENT_ADDED`    | Comentário adicionado       |
| `ATTACHMENT_ADDED` | Anexo enviado               |

Ao criar o webhook você escolhe quais eventos assinar (nenhum marcado = todos).

## Requisição

O Ocean Flow envia um `POST` com `Content-Type: application/json`:

| Header                    | Valor                                  |
| ------------------------- | -------------------------------------- |
| `X-OceanFlow-Event`       | nome do evento                         |
| `X-OceanFlow-Signature`   | `sha256=<hmac>` (veja abaixo)          |

Corpo:

```json
{
  "event": "CARD_MOVED",
  "occurredAt": "2026-06-22T03:56:56.600Z",
  "organizationId": "...",
  "boardId": "...",
  "cardId": "...",
  "actorId": "...",
  "data": { "from": "A Fazer", "to": "Concluído" }
}
```

`actorId` é `null` para ações feitas via API/MCP; `data` varia por evento.

## Verificando a assinatura

A assinatura é o HMAC-SHA256 do **corpo bruto** usando o `secret` do webhook:

```js
import crypto from "node:crypto";

function verify(rawBody, signatureHeader, secret) {
  const expected =
    "sha256=" + crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return signatureHeader === expected;
}
```

Calcule sobre o corpo exatamente como recebido (sem reserializar o JSON).

## Entrega

A entrega é *best-effort*: paralela, com timeout de 5s, e falhas são ignoradas
(não há retry automático). Webhooks inativos não recebem eventos.
