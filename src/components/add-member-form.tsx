"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/actions/organizations";
import {
  FormError,
  FormSuccess,
  SubmitButton,
  inputClass,
} from "@/components/form";

type AddMemberAction = (
  prevState: FormState,
  formData: FormData,
) => Promise<FormState>;

export function AddMemberForm({ action }: { action: AddMemberAction }) {
  const [state, formAction] = useActionState<FormState, FormData>(
    action,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-3">
      <FormError message={state?.error} />
      <FormSuccess message={state?.success} />
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          name="email"
          type="email"
          required
          placeholder="e-mail do membro"
          className={inputClass}
        />
        <select
          name="role"
          defaultValue="MEMBER"
          className={`${inputClass} sm:w-40`}
        >
          <option value="ADMIN">Admin</option>
          <option value="MEMBER">Membro</option>
          <option value="VIEWER">Visualizador</option>
        </select>
        <div className="shrink-0">
          <SubmitButton pendingLabel="Adicionando…">Adicionar</SubmitButton>
        </div>
      </div>
    </form>
  );
}
