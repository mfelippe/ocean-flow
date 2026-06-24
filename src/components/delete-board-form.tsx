"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { deleteBoard, type DeleteBoardState } from "@/app/actions/boards";
import { FormError, inputClass } from "@/components/form";

function DeleteButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Excluindo…" : "Excluir para sempre"}
    </button>
  );
}

export function DeleteBoardForm({
  boardId,
  boardName,
}: {
  boardId: string;
  boardName: string;
}) {
  const [state, action] = useActionState<DeleteBoardState, FormData>(
    deleteBoard.bind(null, boardId),
    undefined,
  );

  return (
    <details className="rounded-lg border border-red-500/40 bg-red-500/5 p-3">
      <summary className="cursor-pointer text-sm font-medium text-red-500 dark:text-red-400">
        Excluir quadro permanentemente
      </summary>
      <form action={action} className="mt-3 space-y-2">
        <FormError message={state?.error} />
        <p className="text-xs text-muted">
          Isto remove <strong>{boardName}</strong> e <strong>todo o seu conteúdo</strong>{" "}
          (colunas, cards, comentários, anexos, automações) — <strong>sem
          recuperação</strong>. Digite sua senha para confirmar.
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
