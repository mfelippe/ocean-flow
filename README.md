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

## 🚀 Instalação (self-hosted)

**Pré-requisito único: Docker.** O jeito mais rápido — usa a imagem publicada
(sem clonar o repositório) e já sobe um PostgreSQL embutido.

**1. Crie uma pasta e baixe o `docker-compose`:**

```bash
mkdir ocean-flow && cd ocean-flow
curl -O https://raw.githubusercontent.com/mfelippe/ocean-flow/main/docker-compose.release.yml
```

**2. Crie o arquivo `.env`** (o comando abaixo já gera o `AUTH_SECRET`):

```bash
cat > .env <<EOF
AUTH_SECRET=$(openssl rand -base64 32)
AUTH_URL=http://localhost:3000
EOF
```

> Em produção, troque `AUTH_URL` pela URL pública (ex.: `https://kanban.seu-dominio.com`).

**3. Suba:**

```bash
docker compose -f docker-compose.release.yml up -d
```

**4. Acesse <http://localhost:3000>.** No primeiro acesso, a tela **`/setup`**
cria o **usuário administrador** e a **primeira organização** (no estilo do
Uptime Kuma). Pronto. ✅

As migrations rodam sozinhas no start; os anexos ficam num volume
(`oceanflow_uploads`) e o banco em `oceanflow_db`.

> **Banco externo, HTTPS, backup, upgrade e administração** (`/admin`): veja o
> guia completo em **[docs/SELF-HOSTING.md](docs/SELF-HOSTING.md)**.

<details>
<summary>Alternativa: rodar a partir do código-fonte (build local)</summary>

```bash
git clone https://github.com/mfelippe/ocean-flow.git
cd ocean-flow
docker compose up --build -d        # builda a imagem + sobe Postgres
```

Sobe em <http://localhost:3000>. Útil para testar mudanças no código sem
publicar uma imagem.

</details>

## 💻 Desenvolvimento local

Para contribuir com o código (sem Docker para a app). Pré-requisitos: Node 22
(veja [.nvmrc](.nvmrc)), Docker (só para o Postgres) e Git.

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

| Variável       | Obrigatória | Descrição                                                                |
| -------------- | ----------- | ------------------------------------------------------------------------ |
| `AUTH_SECRET`  | **sim**     | Segredo do Auth.js — gere com `openssl rand -base64 32`                  |
| `AUTH_URL`     | recomendada | URL pública da instância (ex.: `https://kanban.seu-dominio.com`)         |
| `DATABASE_URL` | não\*       | Postgres externo (`postgresql://…`). \*Sem ela, usa o banco embutido.    |
| `PORT`         | não         | Porta exposta (padrão `3000`)                                            |
| `UPLOAD_DIR`   | não         | Diretório dos anexos (Docker: `/data/uploads`; dev: `./uploads`)         |

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
