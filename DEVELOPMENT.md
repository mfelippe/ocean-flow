# Fluxo de Desenvolvimento — Ocean Flow

Este documento descreve **como** o Ocean Flow é construído: o roteiro em fases,
o ambiente local, e as convenções de branch, commit e revisão.

> Visão do produto → [README.md](./README.md)
> Regras técnicas e de domínio → [AGENTS.md](./AGENTS.md)

---

## Ambiente local

Pré-requisitos: Node 22 (via `nvm use`), Docker, Git.

```bash
nvm use
npm install
cp .env.example .env          # ajuste AUTH_SECRET com: openssl rand -base64 32
docker compose up db -d       # Postgres em container
npm run db:migrate            # cria/atualiza o schema
npm run dev                   # http://localhost:3000
```

Para testar a stack completa em container (igual produção):

```bash
docker compose up --build
```

---

## Roteiro em fases

Cada fase entrega algo funcional e testável. Não comece a próxima sem a
"Definição de pronto" (DoD) da atual.

### Fase 0 — Esqueleto ✅ (em andamento)
Next.js + TypeScript, Prisma + Postgres, Tailwind, Docker Compose, lint/typecheck.
**DoD:** `docker compose up` sobe a home com health-check do banco verde.

### Fase 1 — Auth + Organizações
`User`, `Organization`, `Membership`; Auth.js (credentials); cadastro/login;
criação de workspace; convite por papel (`Role`).
**DoD:** usuário se cadastra, loga e cria uma organização.

### Fase 2 — CRUD de quadros
`Board`, `Column`, `Card` com criar/editar/arquivar. Sem drag — mover por botão.
**DoD:** montar um quadro com colunas e cards via UI.

### Fase 3 — Drag & drop
@dnd-kit + ranking fracionário + atualização otimista (TanStack Query).
**DoD:** arrastar e reordenar cards entre colunas, persistindo no banco.

### Fase 4 — Detalhe do card
Descrição (markdown), labels, due date, comentários, anexos, painel de atividade.
**DoD:** card rico, utilizável no dia a dia.

### Fase 5 — Tempo real
Socket.io: movimentos e edições propagam ao vivo entre usuários do mesmo quadro.
**DoD:** dois navegadores veem o mesmo quadro sincronizar sem refresh.

### Fase 6 — Plataforma
Permissões refinadas por quadro, automações (gatilho → ação), webhooks, API pública.

### Fase 7 — Release self-hosted
Imagem Docker publicada, compose de produção, variáveis documentadas, backup do
Postgres, guia de instalação estilo Uptime Kuma.

---

## Convenções de Git

### Branches
- `main` — sempre estável (typecheck + lint + build passando).
- `feat/<fase>-<descricao>` — ex.: `feat/1-auth-organizacoes`.
- `fix/<descricao>`, `chore/<descricao>`, `docs/<descricao>`.

### Commits — [Conventional Commits](https://www.conventionalcommits.org/)
```
feat(boards): cria CRUD de colunas
fix(auth): corrige sessão expirada
chore(deps): atualiza prisma para 6.2
docs: documenta fluxo de migration
```
Tipos: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `style`.

### Pull Requests
- Um PR por fase ou por incremento coeso.
- Descrição: o que muda, qual fase/DoD atende, como testar.
- Checklist antes de abrir:
  - [ ] `npm run typecheck` limpo
  - [ ] `npm run lint` limpo
  - [ ] migrations commitadas (se mexeu no `schema.prisma`)
  - [ ] testado localmente

---

## Workflow de banco de dados

1. Edite `prisma/schema.prisma`.
2. `npm run db:migrate` — gera a migration e atualiza o banco local.
3. Commite a pasta `prisma/migrations/` junto com o código.
4. Em produção/deploy, `migrate deploy` roda automaticamente no start do container.

Nunca edite o banco à mão — toda mudança de schema vira migration versionada.

---

## Definição de "pronto" (geral)

Uma tarefa só está pronta quando:
- compila (`typecheck`) e passa no `lint`;
- respeita as regras de domínio do [AGENTS.md](./AGENTS.md) (tenancy, ranking, validação Zod, soft delete);
- foi testada manualmente no fluxo que ela afeta;
- documentação/`.env.example` atualizados se algo mudou na configuração.
