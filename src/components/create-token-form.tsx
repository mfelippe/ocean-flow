"use client";

import { useActionState, useEffect, useRef } from "react";
import type { TokenFormState } from "@/app/actions/api-tokens";
import { FormError, SubmitButton, inputClass } from "@/components/form";

type Action = (
  prev: TokenFormState,
  fd: FormData,
) => Promise<TokenFormState>;

export function CreateTokenForm({ action }: { action: Action }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState<TokenFormState, FormData>(
    action,
    undefined,
  );

  useEffect(() => {
    if (state?.token) formRef.current?.reset();
  }, [state]);

  return (
    <div className="space-y-3">
      {state?.token && (
        <div className="rounded-lg border border-brand/40 bg-brand/10 p-3">
          <p className="text-xs font-medium text-brand">
            Token criado — copie agora, ele não será exibido novamente:
          </p>
          <code className="mt-1 block break-all text-xs text-ink">
            {state.token}
          </code>
          <p className="mt-2 text-xs text-muted">
            Veja as rotas disponíveis e teste com este token na{" "}
            <a
              href="/api-docs"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-brand hover:underline"
            >
              documentação interativa →
            </a>
          </p>
        </div>
      )}

      <form ref={formRef} action={formAction} className="space-y-2">
        <FormError message={state?.error} />
        <div className="flex gap-2">
          <input
            name="name"
            required
            placeholder="Nome do token (ex.: integração CI)"
            className={inputClass}
          />
          <div className="shrink-0">
            <SubmitButton pendingLabel="Gerando…">Gerar token</SubmitButton>
          </div>
        </div>
      </form>
    </div>
  );
}
