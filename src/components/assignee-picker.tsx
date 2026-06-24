"use client";

import { useTransition } from "react";
import { setCardAssignee } from "@/app/actions/cards";
import { Avatar } from "@/components/avatar";
import { inputClass } from "@/components/form";

type Member = { id: string; name: string };

export function AssigneePicker({
  cardId,
  members,
  currentId,
  currentName,
  canWrite,
}: {
  cardId: string;
  members: Member[];
  currentId: string | null;
  currentName: string | null;
  canWrite: boolean;
}) {
  const [pending, startTransition] = useTransition();

  if (!canWrite) {
    return currentName ? (
      <div className="flex items-center gap-2">
        <Avatar name={currentName} size={24} />
        <span className="text-sm">{currentName}</span>
      </div>
    ) : (
      <p className="text-sm text-subtle">Ninguém</p>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {currentName && <Avatar name={currentName} size={24} />}
      <select
        defaultValue={currentId ?? ""}
        disabled={pending}
        onChange={(e) =>
          startTransition(() => setCardAssignee(cardId, e.target.value || null))
        }
        className={inputClass}
      >
        <option value="">Ninguém</option>
        {members.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>
    </div>
  );
}
