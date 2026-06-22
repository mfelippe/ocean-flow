"use client";

import { useActionState, useEffect, useRef } from "react";
import type { FormState } from "@/app/actions/webhooks";
import { FormError, SubmitButton, inputClass } from "@/components/form";

type Action = (prev: FormState, fd: FormData) => Promise<FormState>;

export function CreateWebhookForm({ action }: { action: Action }) {
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
          name="url"
          type="url"
          required
          placeholder="https://exemplo.com/webhook"
          className={inputClass}
        />
        <div className="shrink-0">
          <SubmitButton pendingLabel="Adicionando…">Adicionar</SubmitButton>
        </div>
      </div>
    </form>
  );
}
