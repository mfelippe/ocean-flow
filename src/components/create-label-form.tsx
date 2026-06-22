"use client";

import { useActionState, useEffect, useRef } from "react";
import type { FormState } from "@/app/actions/cards";
import { FormError, SubmitButton, inputClass } from "@/components/form";

type Action = (prev: FormState, fd: FormData) => Promise<FormState>;

const PRESETS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
];

export function CreateLabelForm({ action }: { action: Action }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState<FormState, FormData>(
    action,
    undefined,
  );

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-2">
      <FormError message={state?.error} />
      <div className="flex gap-2">
        <input
          name="name"
          required
          placeholder="Nova label"
          className={inputClass}
        />
        <input
          type="color"
          name="color"
          defaultValue={PRESETS[4]}
          className="h-9 w-10 shrink-0 cursor-pointer rounded border border-slate-700 bg-slate-900"
          list="label-colors"
        />
        <datalist id="label-colors">
          {PRESETS.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </div>
      <SubmitButton pendingLabel="Criando…">Criar label</SubmitButton>
    </form>
  );
}
