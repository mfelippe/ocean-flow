# AGENTS.md

Guia para agentes de IA e desenvolvedores que trabalham no **Ocean Flow**.
Leia antes de escrever código. Estas instruções têm prioridade sobre suposições padrão.

## O que é o Ocean Flow

Plataforma open source de Kanban e fluxos de trabalho, **self-hosted** (filosofia
Uptime Kuma: subir com um comando). Evolui para orquestração de processos
(automações, integrações, permissões). Veja a visão em [README.md](./README.md).

## Stack

| Camada        | Tecnologia                                  |
| ------------- | ------------------------------------------- |
| Framework     | Next.js (App Router) + TypeScript — monolito |
| Banco         | PostgreSQL                                  |
| ORM           | Prisma                                      |
| UI            | Tailwind CSS v4 + shadcn/ui                  |
| Drag & drop   | @dnd-kit (a partir da Fase 3)               |
| Estado client | TanStack Query + Zustand (a partir da Fase 3) |
| Auth          | Auth.js (NextAuth v5, credentials) — Fase 1 |
| Validação     | Zod                                         |
| Deploy        | Docker + Docker Compose                     |

**Node:** use a versão do [.nvmrc](./.nvmrc) (22). `nvm use` antes de tudo.
O Node do sistema pode ser antigo demais para o Next 15.

## Comandos

```bash
nvm use                       # ativa o Node correto
npm install                   # instala dependências
docker compose up db -d       # sobe só o Postgres para dev local
cp .env.example .env          # configure o ambiente
npm run db:migrate            # aplica migrations (dev)
npm run dev                   # http://localhost:3000

npm run typecheck             # tsc --noEmit
npm run lint                  # eslint
npm run db:studio             # Prisma Studio (inspeção do banco)
```

Deploy completo (app + banco): `docker compose up --build`.

## Estrutura

```
src/
  app/        rotas (App Router), layouts, server components
  lib/        utilitários compartilhados (ex.: lib/prisma.ts — singleton)
prisma/
  schema.prisma   fonte da verdade do modelo de dados
  migrations/     geradas por `npm run db:migrate` — versionadas
```

Alias de import: `@/*` → `src/*`.

## Regras de domínio que NÃO devem ser violadas

1. **Tenancy.** Toda tabela de domínio pertence a uma `Organization` (direta ou
   indiretamente). Ao criar entidades novas, mantenha o caminho até `organizationId`.
   Consultas devem sempre filtrar pela organização do usuário autenticado.

2. **Ordenação por ranking fracionário.** `Column.rank` e `Card.rank` são **strings**.
   Mover um item = calcular um rank entre o vizinho de cima e o de baixo; grava-se
   **apenas a linha movida**. Nunca reindexar a lista inteira nem usar inteiros
   sequenciais para posição.

3. **Mutations no servidor.** Escritas passam por Server Actions / Route Handlers,
   sempre validadas com **Zod** e autorizadas pelo papel (`Role`) do membro.

4. **Soft delete.** Boards e Cards usam `archivedAt` (não apague linhas por padrão).

## Convenções

- TypeScript estrito; sem `any` sem justificativa.
- Server Components por padrão; `"use client"` só quando há interatividade.
- Comentários e UI em **português**; nomes de código em inglês.
- Após mudar `schema.prisma`, rode `npm run db:migrate` e commite a migration.
- Antes de finalizar uma tarefa: `npm run typecheck` e `npm run lint` limpos.

## Fluxo de trabalho

Desenvolvimento em fases — veja [DEVELOPMENT.md](./DEVELOPMENT.md) para o roteiro,
convenções de branch/commit e a definição de "pronto" de cada fase.
