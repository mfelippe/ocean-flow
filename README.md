# Ocean Flow

Plataforma **open source** e **self-hosted** de Kanban e fluxos de trabalho —
no espírito do Uptime Kuma: suba a sua própria instância com um comando, sem
depender de ferramentas proprietárias.

> 🚧 Em desenvolvimento ativo. Já é utilizável: organizações, quadros com
> arrastar-e-soltar, cards ricos, permissões, e integrações (API REST, MCP e
> webhooks).

---

## Funcionalidades

- **Quadros Kanban** com colunas e cards, **arrastar-e-soltar** (dentro e entre
  colunas) e ordenação estável por ranking fracionário.
- **Cards ricos**: descrição em Markdown, labels coloridas, prazo (due date),
  comentários, anexos e feed de atividade.
- **Organizações e membros** com papéis (OWNER, ADMIN, MEMBER, VIEWER).
- **Permissões por quadro**: quadros públicos à organização ou privados, com
  papéis específicos por quadro. Veja [docs/PERMISSIONS.md](docs/PERMISSIONS.md).
- **Busca ao vivo** no quadro (título + descrição) e tema **claro/escuro**.
- **Integrações** (veja abaixo): API REST pública, servidor **MCP** para agentes
  de IA, e **webhooks** de eventos.
- **Conta**: cadastro/login próprios, avatar de iniciais e troca de senha.

## Stack

| Camada       | Tecnologia                                  |
| ------------ | ------------------------------------------- |
| Framework    | Next.js (App Router) + TypeScript — monólito |
| Banco        | PostgreSQL + Prisma                          |
| UI           | Tailwind CSS v4                              |
| Drag & drop  | @dnd-kit                                     |
| Autenticação | Auth.js (NextAuth v5, credenciais)          |
| Deploy       | Docker + Docker Compose                      |

Detalhes de arquitetura e convenções: [AGENTS.md](AGENTS.md) ·
fluxo de desenvolvimento: [DEVELOPMENT.md](DEVELOPMENT.md).

---

## Subindo com Docker (recomendado)

Pré-requisito: Docker.

```bash
git clone https://github.com/mfelippe/ocean-flow.git
cd ocean-flow
docker compose up --build
```

A aplicação sobe em <http://localhost:3000> (app + PostgreSQL). As migrations
são aplicadas automaticamente no start, e os anexos ficam num volume
(`oceanflow_uploads`).

> **Produção:** para usar a imagem publicada (sem build), secrets via `.env`,
> backup, upgrade e HTTPS, veja o guia **[docs/SELF-HOSTING.md](docs/SELF-HOSTING.md)**.

## Desenvolvimento local

Pré-requisitos: Node 22 (veja [.nvmrc](.nvmrc)), Docker, Git.

```bash
nvm use
npm install
cp .env.example .env          # ajuste AUTH_SECRET
docker compose up db -d        # apenas o Postgres
npm run db:migrate             # aplica as migrations
npm run dev                    # http://localhost:3000
```

Scripts úteis: `npm run typecheck`, `npm run lint`, `npm run db:studio`.

## Variáveis de ambiente

| Variável        | Descrição                                              |
| --------------- | ------------------------------------------------------ |
| `DATABASE_URL`  | String de conexão do PostgreSQL                        |
| `AUTH_SECRET`   | Segredo do Auth.js (`openssl rand -base64 32`)         |
| `AUTH_URL`      | URL base da aplicação (ex.: `http://localhost:3000`)   |
| `UPLOAD_DIR`    | Diretório dos anexos (padrão `./uploads`; Docker: `/data/uploads`) |
| `NODE_ENV`      | `development` / `production`                           |

---

## Integrações

Tudo é configurado por organização em **Integrações**
(`/orgs/<slug>/settings`, restrito a OWNER/ADMIN) e autenticado por **token de
API** (`Authorization: Bearer <token>`).

- **API REST** — ler/criar/atualizar quadros e cards. → [docs/API.md](docs/API.md)
  · documentação interativa em **`/api-docs`**.
- **Servidor MCP** — exponha o Kanban como ferramentas para agentes de IA.
  → [docs/MCP.md](docs/MCP.md) · referência navegável em **`/mcp-docs`**.
- **Webhooks** — receba eventos (card criado/movido, comentário, anexo…) com
  payload assinado. → [docs/WEBHOOKS.md](docs/WEBHOOKS.md)
- **Automações** — regras gatilho → ação por quadro (mover, label, comentar,
  criar card em outro quadro, requisição HTTP). → [docs/AUTOMATIONS.md](docs/AUTOMATIONS.md)

## Público-alvo

Pequenas e médias empresas, times de produto e desenvolvimento, operações e
backoffice, e organizações que buscam independência de soluções SaaS.

## Licença

Open source. (Defina aqui a licença do projeto, ex.: MIT.)
