"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/actions/boards";
import { FormError, SubmitButton, inputClass } from "@/components/form";

type CreateBoardAction = (
  prevState: FormState,
  formData: FormData,
) => Promise<FormState>;

export function CreateBoardForm({ action }: { action: CreateBoardAction }) {
  const [state, formAction] = useActionState<FormState, FormData>(
    action,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-3">
      <FormError message={state?.error} />
      <div className="flex gap-2">
        <input
          name="name"
          type="text"
          required
          placeholder="Nome do quadro"
          className={inputClass}
        />
        <div className="shrink-0">
          <SubmitButton pendingLabel="Criando…">Criar quadro</SubmitButton>
        </div>
      </div>
    </form>
  );
}
