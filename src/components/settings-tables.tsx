"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { ConfirmButton } from "@/components/confirm-button";

// Tabelas (DataTable: busca + ordenação + paginação) das listas de
// configuração. Recebem dados serializáveis + as server actions (vinculadas
// por linha aqui no cliente).

type Action0 = () => void | Promise<void>;
type Action1 = (id: string) => void | Promise<void>;

// ─── Membros do quadro ───────────────────────────────────────────────
type MemberRow = { id: string; name: string; email: string; role: string };

export function BoardMembersTable({
  members,
  onRemove,
}: {
  members: MemberRow[];
  onRemove: Action1;
}) {
  const columns = React.useMemo<ColumnDef<MemberRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Membro",
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.name}</p>
            <p className="text-xs text-subtle">{row.original.email}</p>
          </div>
        ),
      },
      {
        accessorKey: "role",
        header: "Papel",
        cell: ({ getValue }) => (
          <span className="text-xs uppercase tracking-wide text-muted">
            {getValue<string>()}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <ConfirmButton
              action={onRemove.bind(null, row.original.id) as Action0}
              triggerClassName="text-xs text-subtle hover:text-red-400"
              title="Remover do quadro?"
              description={`${row.original.name} perderá o acesso específico a este quadro.`}
              confirmLabel="Remover"
            >
              remover
            </ConfirmButton>
          </div>
        ),
      },
    ],
    [onRemove],
  );
  return <DataTable columns={columns} data={members} searchPlaceholder="Buscar membro…" />;
}

// ─── Campos personalizados ───────────────────────────────────────────
type FieldRow = { id: string; name: string; typeLabel: string };

export function CustomFieldsTable({
  fields,
  onDelete,
}: {
  fields: FieldRow[];
  onDelete: Action1;
}) {
  const columns = React.useMemo<ColumnDef<FieldRow>[]>(
    () => [
      { accessorKey: "name", header: "Campo", cell: ({ getValue }) => <span className="font-medium">{getValue<string>()}</span> },
      { accessorKey: "typeLabel", header: "Tipo", cell: ({ getValue }) => <span className="text-xs text-subtle">{getValue<string>()}</span> },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <ConfirmButton
              action={onDelete.bind(null, row.original.id) as Action0}
              triggerClassName="text-xs text-subtle hover:text-red-400"
              title="Excluir campo?"
              description={`O campo "${row.original.name}" e seus valores em todos os cards serão removidos.`}
              confirmLabel="Excluir"
            >
              excluir
            </ConfirmButton>
          </div>
        ),
      },
    ],
    [onDelete],
  );
  return <DataTable columns={columns} data={fields} searchPlaceholder="Buscar campo…" />;
}

// ─── Automações ──────────────────────────────────────────────────────
type AutomationRow = {
  id: string;
  name: string;
  enabled: boolean;
  triggerText: string;
  actionsText: string;
};

export function AutomationsTable({
  automations,
  onToggle,
  onDelete,
}: {
  automations: AutomationRow[];
  onToggle: Action1;
  onDelete: Action1;
}) {
  const columns = React.useMemo<ColumnDef<AutomationRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Automação",
        cell: ({ row }) => (
          <span className="font-medium">
            {row.original.name}
            {!row.original.enabled && (
              <span className="ml-2 rounded bg-edge px-1.5 py-0.5 text-[10px] uppercase text-subtle">
                pausada
              </span>
            )}
          </span>
        ),
      },
      {
        id: "rule",
        header: "Regra",
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-xs text-subtle">
            {row.original.triggerText} → {row.original.actionsText}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-3">
            <form action={onToggle.bind(null, row.original.id) as Action0}>
              <button className="text-xs text-muted hover:text-brand">
                {row.original.enabled ? "pausar" : "ativar"}
              </button>
            </form>
            <ConfirmButton
              action={onDelete.bind(null, row.original.id) as Action0}
              triggerClassName="text-xs text-subtle hover:text-red-400"
              title="Excluir automação?"
              description={`A automação "${row.original.name}" será removida permanentemente.`}
              confirmLabel="Excluir"
            >
              excluir
            </ConfirmButton>
          </div>
        ),
      },
    ],
    [onToggle, onDelete],
  );
  return <DataTable columns={columns} data={automations} searchPlaceholder="Buscar automação…" />;
}

// ─── Webhooks ────────────────────────────────────────────────────────
type WebhookRow = {
  id: string;
  url: string;
  active: boolean;
  eventsText: string;
  secret: string;
};

export function WebhooksTable({
  webhooks,
  onToggle,
  onDelete,
}: {
  webhooks: WebhookRow[];
  onToggle: Action1;
  onDelete: Action1;
}) {
  const columns = React.useMemo<ColumnDef<WebhookRow>[]>(
    () => [
      {
        accessorKey: "url",
        header: "URL",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate text-sm">{row.original.url}</p>
            <p className="truncate text-[11px] text-subtle">
              secret: <code>{row.original.secret}</code>
            </p>
          </div>
        ),
      },
      { accessorKey: "eventsText", header: "Eventos", cell: ({ getValue }) => <span className="text-xs text-muted">{getValue<string>()}</span> },
      {
        accessorKey: "active",
        header: "Status",
        cell: ({ getValue }) =>
          getValue<boolean>() ? (
            <span className="rounded bg-brand/15 px-1.5 py-0.5 text-[10px] font-medium text-brand">ativo</span>
          ) : (
            <span className="rounded bg-edge px-1.5 py-0.5 text-[10px] font-medium text-muted">inativo</span>
          ),
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-3">
            <form action={onToggle.bind(null, row.original.id) as Action0}>
              <button className="text-xs text-muted hover:text-brand">
                {row.original.active ? "desativar" : "ativar"}
              </button>
            </form>
            <ConfirmButton
              action={onDelete.bind(null, row.original.id) as Action0}
              triggerClassName="text-xs text-subtle hover:text-red-400"
              title="Remover webhook?"
              description="A URL deixará de receber eventos. Esta ação não pode ser desfeita."
              confirmLabel="Remover"
            >
              remover
            </ConfirmButton>
          </div>
        ),
      },
    ],
    [onToggle, onDelete],
  );
  return <DataTable columns={columns} data={webhooks} searchPlaceholder="Buscar webhook…" />;
}

// ─── Cards arquivados ────────────────────────────────────────────────
type ArchivedCardRow = { id: string; title: string; columnName: string };

export function ArchivedCardsTable({
  cards,
  onUnarchive,
  onDelete,
}: {
  cards: ArchivedCardRow[];
  onUnarchive: Action1;
  onDelete: Action1;
}) {
  const columns = React.useMemo<ColumnDef<ArchivedCardRow>[]>(
    () => [
      {
        accessorKey: "title",
        header: "Card",
        cell: ({ getValue }) => <span className="font-medium">{getValue<string>()}</span>,
      },
      {
        accessorKey: "columnName",
        header: "Coluna",
        cell: ({ getValue }) => (
          <span className="text-xs text-subtle">{getValue<string>()}</span>
        ),
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-3">
            <form action={onUnarchive.bind(null, row.original.id) as Action0}>
              <button className="text-xs text-brand hover:underline">desarquivar</button>
            </form>
            <ConfirmButton
              action={onDelete.bind(null, row.original.id) as Action0}
              triggerClassName="text-xs text-subtle hover:text-red-400"
              title="Excluir permanentemente?"
              description={`"${row.original.title}" e todo o seu conteúdo serão removidos para sempre. Esta ação não pode ser desfeita.`}
              confirmLabel="Excluir para sempre"
            >
              excluir
            </ConfirmButton>
          </div>
        ),
      },
    ],
    [onUnarchive, onDelete],
  );
  return <DataTable columns={columns} data={cards} searchPlaceholder="Buscar card arquivado…" />;
}

// ─── Tokens de API ───────────────────────────────────────────────────
type TokenRow = { id: string; name: string; prefix: string; lastUsedText: string };

export function TokensTable({
  tokens,
  onRevoke,
}: {
  tokens: TokenRow[];
  onRevoke: Action1;
}) {
  const columns = React.useMemo<ColumnDef<TokenRow>[]>(
    () => [
      { accessorKey: "name", header: "Nome", cell: ({ getValue }) => <span className="text-sm">{getValue<string>()}</span> },
      { accessorKey: "prefix", header: "Prefixo", cell: ({ getValue }) => <code className="text-xs text-subtle">{getValue<string>()}…</code> },
      { accessorKey: "lastUsedText", header: "Último uso", cell: ({ getValue }) => <span className="text-xs text-subtle">{getValue<string>()}</span> },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <ConfirmButton
              action={onRevoke.bind(null, row.original.id) as Action0}
              triggerClassName="text-xs text-subtle hover:text-red-400"
              title="Revogar token?"
              description="Aplicações que usam este token perderão o acesso imediatamente."
              confirmLabel="Revogar"
            >
              revogar
            </ConfirmButton>
          </div>
        ),
      },
    ],
    [onRevoke],
  );
  return <DataTable columns={columns} data={tokens} searchPlaceholder="Buscar token…" />;
}
