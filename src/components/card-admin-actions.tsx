"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { moveCardToBoard, deleteCardPermanent } from "@/app/actions/cards";
import { ConfirmButton } from "@/components/confirm-button";
import { inputClass } from "@/components/form";

type BoardOption = { id: string; name: string };

/** Ações restritas ao admin do quadro: mover o card para outro quadro da org
 *  (vai para a primeira coluna) e excluir permanentemente. */
export function CardAdminActions({
  cardId,
  slug,
  boardHref,
  boards,
}: {
  cardId: string;
  slug: string;
  boardHref: string;
  boards: BoardOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [target, setTarget] = useState("");

  return (
    <div className="space-y-3">
      {boards.length > 0 && (
        <div className="flex gap-2">
          <select
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            disabled={pending}
            className={inputClass}
          >
            <option value="">Mover para outro quadro…</option>
            {boards.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!target || pending}
            onClick={() =>
              startTransition(async () => {
                await moveCardToBoard(cardId, target);
                router.push(`/orgs/${slug}/boards/${target}`);
              })
            }
            className="shrink-0 rounded-lg border border-edge px-3 py-2 text-xs text-ink hover:bg-edge disabled:opacity-40"
          >
            Mover
          </button>
        </div>
      )}

      <ConfirmButton
        action={async () => {
          await deleteCardPermanent(cardId);
          router.push(boardHref);
        }}
        triggerClassName="text-xs text-subtle hover:text-red-400"
        title="Excluir card permanentemente?"
        description="O card e todo o seu conteúdo (comentários, anexos, campos) serão removidos para sempre. Esta ação não pode ser desfeita."
        confirmLabel="Excluir para sempre"
      >
        excluir permanentemente
      </ConfirmButton>
    </div>
  );
}
