import Link from "next/link";
import { Paperclip } from "lucide-react";

type CardVM = {
  id: string;
  title: string;
  dueDate: string | null;
  labels: { id: string; name: string; color: string }[];
  attachmentCount: number;
};
type ColumnVM = { id: string; name: string; cards: CardVM[] };

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

/** Visão em lista: cards agrupados por coluna, um por linha. */
export function BoardListView({
  columns,
  slug,
  boardId,
}: {
  columns: ColumnVM[];
  slug: string;
  boardId: string;
}) {
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      {columns.map((col) => (
        <section key={col.id}>
          <h2 className="mb-2 text-sm font-semibold text-muted">
            {col.name}{" "}
            <span className="text-subtle">({col.cards.length})</span>
          </h2>
          {col.cards.length === 0 ? (
            <p className="rounded-lg border border-dashed border-edge px-4 py-3 text-xs text-subtle">
              Sem cards.
            </p>
          ) : (
            <ul className="divide-y divide-edge overflow-hidden rounded-xl border border-edge">
              {col.cards.map((card) => (
                <li key={card.id} className="bg-panel/60">
                  <Link
                    href={`/orgs/${slug}/boards/${boardId}/cards/${card.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-elevated/50"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      {card.labels.length > 0 && (
                        <span className="flex shrink-0 gap-1">
                          {card.labels.map((l) => (
                            <span
                              key={l.id}
                              title={l.name}
                              className="h-2 w-5 rounded-full"
                              style={{ backgroundColor: l.color }}
                            />
                          ))}
                        </span>
                      )}
                      <span className="truncate text-sm text-ink">{card.title}</span>
                    </div>
                    <div className="flex shrink-0 items-center gap-3 text-xs text-subtle">
                      {card.attachmentCount > 0 && (
                        <span className="inline-flex items-center gap-0.5">
                          <Paperclip className="size-3" />
                          {card.attachmentCount}
                        </span>
                      )}
                      {card.dueDate && <span>{fmtDate(card.dueDate)}</span>}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
