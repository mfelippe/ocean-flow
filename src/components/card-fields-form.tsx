"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/actions/custom-fields";
import { inputTypeFor } from "@/lib/custom-fields";
import {
  FormError,
  FormSuccess,
  SubmitButton,
  inputClass,
  labelClass,
} from "@/components/form";

type FieldVM = {
  id: string;
  name: string;
  type: "TEXT" | "NUMBER" | "DATE";
  value: string;
};

type Action = (prev: FormState, fd: FormData) => Promise<FormState>;

export function CardFieldsForm({
  fields,
  action,
  canWrite,
}: {
  fields: FieldVM[];
  action: Action;
  canWrite: boolean;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(
    action,
    undefined,
  );

  if (!canWrite) {
    return (
      <ul className="space-y-1 text-sm">
        {fields.map((f) => (
          <li key={f.id}>
            <span className="text-xs text-muted">{f.name}: </span>
            {f.value || "—"}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <form action={formAction} className="space-y-2">
      <FormError message={state?.error} />
      {state?.ok && <FormSuccess message="Campos salvos." />}
      {fields.map((f) => (
        <div key={f.id} className="space-y-0.5">
          <label htmlFor={`field_${f.id}`} className={labelClass}>
            {f.name}
          </label>
          <input
            id={`field_${f.id}`}
            name={`field_${f.id}`}
            type={inputTypeFor(f.type)}
            step={f.type === "NUMBER" ? "any" : undefined}
            defaultValue={f.value}
            className={inputClass}
          />
        </div>
      ))}
      <SubmitButton pendingLabel="Salvando…">Salvar campos</SubmitButton>
    </form>
  );
}
