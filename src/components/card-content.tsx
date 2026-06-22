"use client";

import { useActionState, useEffect, useState } from "react";
import { Markdown } from "@/components/markdown";
import { FormError, SubmitButton, inputClass } from "@/components/form";
import type { FormState } from "@/app/actions/cards";

type Action = (prev: FormState, fd: FormData) => Promise<FormState>;

export function CardContent({
  title,
  description,
  canWrite,
  action,
}: {
  title: string;
  description: string | null;
  canWrite: boolean;
  action: Action;
}) {
  const [editing, setEditing] = useState(false);
  const [state, formAction] = useActionState<FormState, FormData>(
    action,
    undefined,
  );

  useEffect(() => {
    if (state?.ok) setEditing(false);
  }, [state]);

  if (editing) {
    return (
      <form action={formAction} className="space-y-3">
        <FormError message={state?.error} />
        <input
          name="title"
          defaultValue={title}
          required
          className={`${inputClass} text-lg font-semibold`}
        />
        <textarea
          name="description"
          defaultValue={description ?? ""}
          rows={8}
          placeholder="Descrição (Markdown suportado)"
          className={`${inputClass} font-mono`}
        />
        <div className="flex gap-2">
          <SubmitButton pendingLabel="Salvando…">Salvar</SubmitButton>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
          >
            Cancelar
          </button>
        </div>
      </form>
    );
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-2xl font-bold">{title}</h1>
        {canWrite && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="shrink-0 rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:bg-slate-800"
          >
            Editar
          </button>
        )}
      </div>
      <div className="mt-4">
        {description ? (
          <Markdown>{description}</Markdown>
        ) : (
          <p className="text-sm text-slate-500">Sem descrição.</p>
        )}
      </div>
    </div>
  );
}
