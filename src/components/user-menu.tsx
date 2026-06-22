"use client";

import { useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import { logout } from "@/app/actions/auth";

export function UserMenu({ name, email }: { name: string; email: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center rounded-full ring-offset-2 ring-offset-surface hover:ring-2 hover:ring-brand"
        aria-label="Menu do usuário"
      >
        <Avatar name={name} size={32} />
      </button>

      {open && (
        <>
          <button
            aria-hidden
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-30 cursor-default"
          />
          <div className="absolute right-0 z-40 mt-2 w-56 overflow-hidden rounded-lg border border-edge bg-elevated shadow-lg">
            <div className="border-b border-edge px-3 py-2">
              <p className="truncate text-sm font-medium text-ink">{name}</p>
              <p className="truncate text-xs text-muted">{email}</p>
            </div>
            <ThemeToggle />
            <Link
              href="/account"
              onClick={() => setOpen(false)}
              className="block border-t border-edge px-3 py-2 text-sm text-ink hover:bg-surface"
            >
              Trocar senha
            </Link>
            <form action={logout} className="border-t border-edge">
              <button className="block w-full px-3 py-2 text-left text-sm text-ink hover:bg-surface">
                Sair
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
