"use client";

import Link from "next/link";
import { useActionState } from "react";
import { authenticate } from "@/app/actions/auth";
import {
  FormError,
  SubmitButton,
  inputClass,
  labelClass,
} from "@/components/form";

export default function LoginPage() {
  const [state, action] = useActionState(authenticate, undefined);

  return (
    <form action={action} className="space-y-4">
      <FormError message={state?.error} />

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
          className={inputClass}
        />
      </div>

      <SubmitButton pendingLabel="Entrando…">Entrar</SubmitButton>

      <p className="text-center text-sm text-slate-400">
        Não tem conta?{" "}
        <Link href="/register" className="text-teal-400 hover:underline">
          Cadastre-se
        </Link>
      </p>
    </form>
  );
}
