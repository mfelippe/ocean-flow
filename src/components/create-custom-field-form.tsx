"use client";

import { useActionState, useEffect, useRef } from "react";
import type { FormState } from "@/app/actions/custom-fields";
import { FormError, SubmitButton, inputClass } from "@/components/form";

type Action = (prev: FormState, fd: FormData) => Promise<FormState>;

export function CreateCustomFieldForm({ action }: { action: Action }) {
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
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          name="name"
          required
          placeholder="Nome do campo (ex.: Telefone)"
          className={inputClass}
        />
        <select name="type" defaultValue="TEXT" className={`${inputClass} sm:w-36`}>
          <option value="TEXT">Texto</option>
          <option value="NUMBER">Número</option>
          <option value="DATE">Data</option>
        </select>
        <div className="shrink-0">
          <SubmitButton pendingLabel="Criando…">Criar campo</SubmitButton>
        </div>
      </div>
    </form>
  );
}
