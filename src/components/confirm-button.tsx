"use client";

import { useState } from "react";

/**
 * Botão que abre um modal de confirmação antes de disparar uma Server Action
 * destrutiva. A `action` é uma server action já vinculada (ex.: bind do id).
 */
export function ConfirmButton({
  action,
  children,
  triggerClassName,
  title,
  description,
  confirmLabel = "Excluir",
}: {
  action: (formData: FormData) => void | Promise<void>;
  children: React.ReactNode;
  triggerClassName?: string;
  title: string;
  description?: string;
  confirmLabel?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={triggerClassName}
        onClick={() => setOpen(true)}
      >
        {children}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            aria-hidden
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="absolute inset-0 cursor-default bg-black/50"
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-sm rounded-xl border border-edge bg-elevated p-5 shadow-xl"
          >
            <h3 className="text-base font-semibold text-ink">{title}</h3>
            {description && (
              <p className="mt-1.5 text-sm text-muted">{description}</p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-edge px-3 py-1.5 text-sm text-ink hover:bg-surface"
              >
                Cancelar
              </button>
              <form action={action}>
                <button
                  type="submit"
                  className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-500"
                >
                  {confirmLabel}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
