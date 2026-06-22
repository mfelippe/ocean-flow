"use client";

import { useActionState, useEffect, useRef } from "react";
import type { FormState } from "@/app/actions/attachments";
import { FormError, SubmitButton } from "@/components/form";

type Action = (prev: FormState, fd: FormData) => Promise<FormState>;

export function AttachmentForm({ action }: { action: Action }) {
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
      <input
        type="file"
        name="file"
        required
        className="block w-full text-xs text-slate-400 file:mr-2 file:rounded file:border-0 file:bg-slate-700 file:px-2 file:py-1 file:text-xs file:text-slate-200 hover:file:bg-slate-600"
      />
      <SubmitButton pendingLabel="Enviando…">Anexar</SubmitButton>
    </form>
  );
}
