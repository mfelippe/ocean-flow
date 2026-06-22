"use client";

import { useActionState, useEffect, useRef } from "react";
import type { FormState } from "@/app/actions/board-access";
import {
  FormError,
  FormSuccess,
  SubmitButton,
  inputClass,
} from "@/components/form";

type Action = (prev: FormState, fd: FormData) => Promise<FormState>;

export function AddBoardMemberForm({ action }: { action: Action }) {
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
      {state?.ok && <FormSuccess message="Membro do quadro atualizado." />}
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          name="email"
          type="email"
          required
          placeholder="e-mail (membro da organização)"
          className={inputClass}
        />
        <select name="role" defaultValue="MEMBER" className={`${inputClass} sm:w-40`}>
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
