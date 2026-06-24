"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { AdminUserActions } from "@/components/admin-user-actions";

export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  isSuperAdmin: boolean;
  blockedAt: Date | string | null;
  createdAt: Date | string;
};

export function AdminUsersTable({
  users,
  adminId,
}: {
  users: AdminUserRow[];
  adminId: string;
}) {
  const columns = React.useMemo<ColumnDef<AdminUserRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Nome",
        cell: ({ row }) => {
          const u = row.original;
          return (
            <span className="font-medium">
              {u.name}
              {u.isSuperAdmin && (
                <span className="ml-2 rounded bg-brand/15 px-1.5 py-0.5 text-[10px] uppercase text-brand">
                  admin
                </span>
              )}
              {u.blockedAt && (
                <span className="ml-2 rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] uppercase text-red-400">
                  bloqueado
                </span>
              )}
            </span>
          );
        },
      },
      {
        accessorKey: "email",
        header: "E-mail",
        cell: ({ getValue }) => (
          <span className="text-subtle">{getValue<string>()}</span>
        ),
      },
      {
        accessorKey: "createdAt",
        header: "Criado em",
        cell: ({ getValue }) => (
          <span className="text-xs text-subtle">
            {new Date(getValue<string>()).toLocaleDateString("pt-BR")}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <AdminUserActions
              userId={row.original.id}
              blocked={!!row.original.blockedAt}
              isSelf={row.original.id === adminId}
            />
          </div>
        ),
      },
    ],
    [adminId],
  );

  return (
    <DataTable
      columns={columns}
      data={users}
      searchPlaceholder="Buscar por nome ou e-mail…"
    />
  );
}
