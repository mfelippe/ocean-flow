"use client";

import * as React from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";

export type TableCardRow = {
  id: string;
  title: string;
  columnName: string;
  dueDate: string | null;
  fields: Record<string, string>;
};

/** Visão tabela/planilha: cards como linhas; campos personalizados viram colunas. */
export function BoardTableView({
  cards,
  customFields,
  slug,
  boardId,
}: {
  cards: TableCardRow[];
  customFields: { id: string; name: string }[];
  slug: string;
  boardId: string;
}) {
  const columns = React.useMemo<ColumnDef<TableCardRow>[]>(() => {
    const base: ColumnDef<TableCardRow>[] = [
      {
        accessorKey: "title",
        header: "Título",
        cell: ({ row }) => (
          <Link
            href={`/orgs/${slug}/boards/${boardId}/cards/${row.original.id}`}
            className="font-medium text-ink hover:text-brand"
          >
            {row.original.title}
          </Link>
        ),
      },
      {
        accessorKey: "columnName",
        header: "Coluna",
        cell: ({ getValue }) => (
          <span className="rounded bg-edge px-1.5 py-0.5 text-xs text-muted">
            {getValue<string>()}
          </span>
        ),
      },
      {
        accessorKey: "dueDate",
        header: "Prazo",
        cell: ({ getValue }) => {
          const v = getValue<string | null>();
          return v ? (
            <span className="text-xs text-muted">
              {new Date(v).toLocaleDateString("pt-BR")}
            </span>
          ) : (
            <span className="text-xs text-subtle">—</span>
          );
        },
      },
    ];

    const fieldCols: ColumnDef<TableCardRow>[] = customFields.map((f) => ({
      id: `field_${f.id}`,
      header: f.name,
      accessorFn: (row) => row.fields[f.name] ?? "",
      cell: ({ getValue }) => {
        const v = getValue<string>();
        return v ? (
          <span className="text-xs text-ink">{v}</span>
        ) : (
          <span className="text-xs text-subtle">—</span>
        );
      },
    }));

    return [...base, ...fieldCols];
  }, [customFields, slug, boardId]);

  return (
    <div className="p-6">
      <DataTable columns={columns} data={cards} searchPlaceholder="Buscar card…" />
    </div>
  );
}
