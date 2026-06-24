# Automações

Regras **gatilho → ações** por quadro. Quando algo acontece no quadro (um card
é criado ou movido), o Ocean Flow executa as ações configuradas — útil para
esteiras automáticas e integrações (ex.: avisar a BotConversa por requisição
HTTP, sem precisar de relay/n8n).

## Quem configura

Apenas **administradores do quadro** (criador do quadro + OWNER/ADMIN da
organização). Ficam em **Configurações do quadro → Automações**
(`/orgs/<slug>/boards/<boardId>/settings`).

## Gatilhos

| Gatilho | Dispara quando… |
| ------- | --------------- |
| **Card criado** | um card é criado (opcionalmente filtrado por coluna; em branco = qualquer coluna) |
| **Card movido para coluna** | um card entra na coluna escolhida |

Os gatilhos disparam em qualquer origem da ação: interface (arrastar/criar),
API REST e servidor MCP.

## Ações

| Ação | O que faz |
| ---- | --------- |
| **Mover card para coluna** | move o card (mesmo quadro) para a coluna escolhida |
| **Criar card em outro quadro** | cria um card em outro quadro/coluna **da mesma organização** |
| **Adicionar / remover label** | aplica ou remove uma label do quadro |
| **Adicionar comentário** | comenta no card (suporta variáveis) |
| **Requisição HTTP** | dispara um `GET`/`POST` para uma URL externa (suporta variáveis em URL, headers e body) |

Uma automação pode ter **várias ações**, executadas em ordem.

## Variáveis (templates)

No comentário, na requisição HTTP (URL/headers/body) e no título/descrição de
"criar card", você pode usar tokens substituídos pelos dados do card de origem:

| Variável | Valor |
| -------- | ----- |
| `{{card.title}}` | título do card |
| `{{card.description}}` | descrição do card |
| `{{card.id}}` | id do card |
| `{{card.url}}` | link do card (usa `AUTH_URL` como base) |
| `{{column.name}}` | nome da coluna atual |
| `{{field.NomeDoCampo}}` | valor de um campo personalizado (ex.: `{{field.Telefone}}`) |

Tokens desconhecidos viram texto vazio.

## Exemplo: integração com a BotConversa

1. No quadro, crie um campo personalizado **Telefone** (texto) e preencha nos cards.
2. Crie uma automação:
   - **Quando:** Card movido para a coluna "Enviar WhatsApp".
   - **Faça:** Requisição HTTP
     - Método: `POST`
     - URL: `https://backend.botconversa.com.br/api/v1/webhook/.../`
     - Headers: `API-KEY: sua-chave`
     - Body:
       ```json
       { "phone": "{{field.Telefone}}", "name": "{{card.title}}" }
       ```

Ao mover um card para essa coluna, o Ocean Flow chama a BotConversa com o
telefone do card — sem nenhum serviço intermediário.

## Exemplo: card de follow-up em outro quadro

- **Quando:** Card movido para "Concluído" (no quadro de Vendas).
- **Faça:** Criar card em outro quadro
  - Quadro: "Pós-venda" · Coluna: "Pendentes"
  - Título: `Follow-up: {{card.title}}`
  - Descrição: `Telefone: {{field.Telefone}}`

## Garantias e limites

- **Tenancy:** "criar card em outro quadro" só aceita quadros da **mesma
  organização** (validado na criação e na execução).
- **Anti-loop:** as ações **não disparam novas automações** — uma automação que
  move/cria um card nunca aciona outra automação em cascata.
- **Execução em segundo plano:** as ações rodam após a resposta ao usuário
  (`after()`), então não atrasam a interface nem a API. Falhas em uma ação não
  derrubam as demais (best-effort) e não são reexecutadas automaticamente.
- A ação **Requisição HTTP** tem timeout de 5s e é best-effort (sem retentativa).
- Pausar uma automação (botão **pausar**) a desativa sem apagá-la.
