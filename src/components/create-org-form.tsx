"use client";

import { useActionState } from "react";
import { createOrganization, type FormState } from "@/app/actions/organizations";
import { FormError, SubmitButton, inputClass } from "@/components/form";

export function CreateOrgForm() {
  const [state, action] = useActionState<FormState, FormData>(
    createOrganization,
    undefined,
  );

  return (
    <form action={action} className="space-y-3">
      <FormError message={state?.error} />
      <div className="flex gap-2">
        <input
          name="name"
          type="text"
          required
          placeholder="Nome da organização"
          className={inputClass}
        />
        <div className="shrink-0">
          <SubmitButton pendingLabel="Criando…">Criar</SubmitButton>
        </div>
      </div>
    </form>
  );
}
