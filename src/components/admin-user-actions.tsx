"use client";

import { useActionState } from "react";
import {
  resetUserPassword,
  setUserBlocked,
  type ResetState,
} from "@/app/actions/admin";
import { ConfirmButton } from "@/components/confirm-button";

export function AdminUserActions({
  userId,
  blocked,
  isSelf,
}: {
  userId: string;
  blocked: boolean;
  isSelf: boolean;
}) {
  const [state, resetAction] = useActionState<ResetState, FormData>(
    resetUserPassword.bind(null, userId),
    undefined,
  );

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-3">
        <form action={resetAction}>
          <button className="text-xs text-muted hover:text-brand">
            resetar senha
          </button>
        </form>

        {isSelf ? (
          <span className="text-xs text-subtle">você</span>
        ) : blocked ? (
          <form action={setUserBlocked.bind(null, userId, false)}>
            <button className="text-xs text-brand hover:underline">
              desbloquear
            </button>
          </form>
        ) : (
          <ConfirmButton
            action={setUserBlocked.bind(null, userId, true)}
            triggerClassName="text-xs text-subtle hover:text-red-400"
            title="Bloquear usuário?"
            description="A pessoa será deslogada e não conseguirá mais entrar até ser desbloqueada."
            confirmLabel="Bloquear"
          >
            bloquear
          </ConfirmButton>
        )}
      </div>

      {state?.error && <p className="text-xs text-red-400">{state.error}</p>}
      {state?.password && (
        <p className="text-xs text-brand">
          Senha temporária:{" "}
          <code className="break-all text-ink">{state.password}</code>{" "}
          <span className="text-subtle">(copie agora)</span>
        </p>
      )}
    </div>
  );
}
