"use client";

import { useActionState } from "react";
import { completeSetup, type FormState } from "@/app/actions/setup";
import {
  FormError,
  SubmitButton,
  inputClass,
  labelClass,
} from "@/components/form";

export function SetupForm() {
  const [state, action] = useActionState<FormState, FormData>(
    completeSetup,
    undefined,
  );

  return (
    <form action={action} className="space-y-4">
      <FormError message={state?.error} />

      <div className="space-y-1">
        <label htmlFor="name" className={labelClass}>Seu nome</label>
        <input id="name" name="name" required className={inputClass} />
      </div>

      <div className="space-y-1">
        <label htmlFor="email" className={labelClass}>E-mail</label>
        <input id="email" name="email" type="email" required className={inputClass} />
      </div>

      <div className="space-y-1">
        <label htmlFor="password" className={labelClass}>Senha</label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          className={inputClass}
        />
        <p className="text-xs text-subtle">Mínimo de 8 caracteres.</p>
      </div>

      <div className="space-y-1">
        <label htmlFor="orgName" className={labelClass}>Nome da organização</label>
        <input id="orgName" name="orgName" required className={inputClass} />
      </div>

      <SubmitButton pendingLabel="Configurando…">Criar admin e começar</SubmitButton>
    </form>
  );
}
