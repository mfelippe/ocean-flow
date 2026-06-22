"use client";

import { useFormStatus } from "react-dom";

export const inputClass =
  "w-full rounded-lg border border-edge bg-panel px-3 py-2 text-sm text-ink outline-none placeholder:text-subtle focus:border-brand";

export const labelClass = "block text-sm font-medium text-muted";

export function SubmitButton({
  children,
  pendingLabel = "Enviando…",
}: {
  children: React.ReactNode;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-ink transition hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? pendingLabel : children}
    </button>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-300">
      {message}
    </p>
  );
}

export function FormSuccess({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="rounded-lg border border-brand/40 bg-brand/10 px-3 py-2 text-sm text-brand">
      {message}
    </p>
  );
}
