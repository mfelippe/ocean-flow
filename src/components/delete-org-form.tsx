"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { deleteOrganization, type DeleteOrgState } from "@/app/actions/organizations";
import { FormError, inputClass } from "@/components/form";

function DeleteButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Excluindo…" : "Excluir organização para sempre"}
    </button>
  );
}

export function DeleteOrgForm({
  orgId,
  orgName,
}: {
  orgId: string;
  orgName: string;
}) {
  const [state, action] = useActionState<DeleteOrgState, FormData>(
    deleteOrganization.bind(null, orgId),
    undefined,
  );

  return (
    <details className="rounded-lg border border-red-500/40 bg-red-500/5 p-3">
      <summary className="cursor-pointer text-sm font-medium text-red-500 dark:text-red-400">
        Excluir organização permanentemente
      </summary>
      <form action={action} className="mt-3 space-y-2">
        <FormError message={state?.error} />
        <p className="text-xs text-muted">
          Isto remove <strong>{orgName}</strong> e <strong>tudo</strong> que ela
          contém (quadros, cards, anexos, membros, webhooks, tokens) — para{" "}
          <strong>todos os membros</strong>, <strong>sem recuperação</strong>.
          Digite sua senha para confirmar.
        </p>
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          placeholder="Sua senha"
          className={inputClass}
        />
        <DeleteButton />
      </form>
    </details>
  );
}
