"use client";

import Link from "next/link";
import { useActionState } from "react";
import { registerUser } from "@/app/actions/auth";
import {
  FormError,
  SubmitButton,
  inputClass,
  labelClass,
} from "@/components/form";

export default function RegisterPage() {
  const [state, action] = useActionState(registerUser, undefined);

  return (
    <form action={action} className="space-y-4">
      <FormError message={state?.error} />

      <div className="space-y-1">
        <label htmlFor="name" className={labelClass}>
          Nome
        </label>
        <input id="name" name="name" type="text" required className={inputClass} />
      </div>

      <div className="space-y-1">
        <label htmlFor="email" className={labelClass}>
          E-mail
        </label>
        <input id="email" name="email" type="email" required className={inputClass} />
      </div>

      <div className="space-y-1">
        <label htmlFor="password" className={labelClass}>
          Senha
        </label>
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

      <SubmitButton pendingLabel="Criando conta…">Criar conta</SubmitButton>

      <p className="text-center text-sm text-muted">
        Já tem conta?{" "}
        <Link href="/login" className="text-brand hover:underline">
          Entrar
        </Link>
      </p>
    </form>
  );
}
