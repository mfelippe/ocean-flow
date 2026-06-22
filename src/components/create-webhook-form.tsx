"use client";

import { useActionState, useEffect, useRef } from "react";
import type { FormState } from "@/app/actions/webhooks";
import { WEBHOOK_EVENTS } from "@/lib/events";
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
    <form ref={formRef} action={formAction} className="space-y-3">
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

      <fieldset>
        <legend className="mb-1.5 text-xs text-muted">
          Disparar em (nenhum marcado = todos os eventos):
        </legend>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
          {WEBHOOK_EVENTS.map((e) => (
            <label
              key={e.value}
              className="flex items-center gap-1.5 text-xs text-ink"
            >
              <input
                type="checkbox"
                name="events"
                value={e.value}
                defaultChecked
                className="accent-[var(--brand)]"
              />
              {e.label}
            </label>
          ))}
        </div>
      </fieldset>
    </form>
  );
}
