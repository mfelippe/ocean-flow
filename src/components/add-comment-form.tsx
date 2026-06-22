"use client";

import { useActionState, useEffect, useRef } from "react";
import type { FormState } from "@/app/actions/cards";
import { FormError, SubmitButton, inputClass } from "@/components/form";

type Action = (prev: FormState, fd: FormData) => Promise<FormState>;

export function AddCommentForm({ action }: { action: Action }) {
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
      <textarea
        name="body"
        required
        rows={3}
        placeholder="Escreva um comentário…"
        className={inputClass}
      />
      <SubmitButton pendingLabel="Enviando…">Comentar</SubmitButton>
    </form>
  );
}
