"use client";

import { useActionState, useEffect, useRef } from "react";
import { changePassword, type FormState } from "@/app/actions/auth";
import {
  FormError,
  FormSuccess,
  SubmitButton,
  inputClass,
  labelClass,
} from "@/components/form";

export function ChangePasswordForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action] = useActionState<FormState, FormData>(
    changePassword,
    undefined,
  );

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="space-y-4">
      <FormError message={state?.error} />
      {state?.ok && <FormSuccess message="Senha alterada com sucesso." />}

      <div className="space-y-1">
        <label htmlFor="currentPassword" className={labelClass}>
          Senha atual
        </label>
        <input
          id="currentPassword"
          name="currentPassword"
          type="password"
          required
          className={inputClass}
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="newPassword" className={labelClass}>
          Nova senha
        </label>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          required
          minLength={8}
          className={inputClass}
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="confirm" className={labelClass}>
          Confirmar nova senha
        </label>
        <input
          id="confirm"
          name="confirm"
          type="password"
          required
          className={inputClass}
        />
      </div>

      <SubmitButton pendingLabel="Salvando…">Salvar nova senha</SubmitButton>
    </form>
  );
}
