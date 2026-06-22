import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getBoardContext } from "@/lib/authz";
import {
  archiveBoard,
  archiveCard,
  createCard,
  createColumn,
  deleteColumn,
  moveCard,
  moveColumn,
  renameBoard,
  renameColumn,
  updateCard,
} from "@/app/actions/boards";
import { inputClass } from "@/components/form";

const iconBtn =
  "rounded px-1.5 py-0.5 text-xs text-slate-400 hover:bg-slate-700 hover:text-slate-100 disabled:opacity-30";

export default async function BoardPage({
  params,
}: {
  params: Promise<{ slug: string; boardId: string }>;
}) {
  const { slug, boardId } = await params;
  const { board, role } = await getBoardContext(boardId);
  if (board.organization.slug !== slug || board.archivedAt) notFound();

  const canWrite = role !== "VIEWER";

  const columns = await prisma.column.findMany({
    where: { boardId },
    orderBy: { rank: "asc" },
    include: {
      cards: { where: { archivedAt: null }, orderBy: { rank: "asc" } },
    },
  });

  return (
    <main className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
        <div className="flex items-center gap-4">
          <Link
            href={`/orgs/${slug}`}
            className="text-sm text-slate-400 hover:text-teal-400"
          >
            ← {board.organization.slug}
          </Link>
          {canWrite ? (
            <details className="group relative">
              <summary className="cursor-pointer list-none text-lg font-bold">
                {board.name}
              </summary>
              <form
                action={renameBoard.bind(null, boardId)}
                className="absolute z-10 mt-2 flex gap-2 rounded-lg border border-slate-700 bg-slate-900 p-2"
              >
                <input
                  name="name"
                  defaultValue={board.name}
                  required
                  className={inputClass}
                />
                <button className={iconBtn}>Salvar</button>
              </form>
            </details>
          ) : (
            <h1 className="text-lg font-bold">{board.name}</h1>
          )}
        </div>
        {canWrite && (
          <form action={archiveBoard.bind(null, boardId)}>
            <button className="text-xs text-slate-500 hover:text-red-400">
              Arquivar quadro
            </button>
          </form>
        )}
      </header>

      <div className="flex flex-1 gap-4 overflow-x-auto p-6">
        {columns.map((column, colIndex) => (
          <section
            key={column.id}
            className="flex max-h-full w-72 shrink-0 flex-col rounded-xl border border-slate-800 bg-slate-900/40"
          >
            <div className="flex items-center justify-between gap-2 border-b border-slate-800 px-3 py-2">
              {canWrite ? (
                <details className="group relative min-w-0 flex-1">
                  <summary className="cursor-pointer list-none truncate text-sm font-semibold">
                    {column.name}
                  </summary>
                  <form
                    action={renameColumn.bind(null, column.id)}
                    className="absolute z-10 mt-2 flex gap-2 rounded-lg border border-slate-700 bg-slate-900 p-2"
                  >
                    <input
                      name="name"
                      defaultValue={column.name}
                      required
                      className={inputClass}
                    />
                    <button className={iconBtn}>Salvar</button>
                  </form>
                </details>
              ) : (
                <span className="truncate text-sm font-semibold">
                  {column.name}
                </span>
              )}
              <span className="shrink-0 text-xs text-slate-500">
                {column.cards.length}
              </span>
              {canWrite && (
                <div className="flex shrink-0 items-center">
                  <form action={moveColumn.bind(null, column.id, "left")}>
                    <button className={iconBtn} disabled={colIndex === 0}>
                      ◀
                    </button>
                  </form>
                  <form action={moveColumn.bind(null, column.id, "right")}>
                    <button
                      className={iconBtn}
                      disabled={colIndex === columns.length - 1}
                    >
                      ▶
                    </button>
                  </form>
                  <form action={deleteColumn.bind(null, column.id)}>
                    <button className={`${iconBtn} hover:text-red-400`}>
                      ✕
                    </button>
                  </form>
                </div>
              )}
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto p-2">
              {column.cards.map((card, cardIndex) => (
                <article
                  key={card.id}
                  className="rounded-lg border border-slate-700 bg-slate-800/70 p-2.5"
                >
                  <p className="text-sm">{card.title}</p>
                  {card.description && (
                    <p className="mt-1 line-clamp-3 text-xs text-slate-400">
                      {card.description}
                    </p>
                  )}
                  {canWrite && (
                    <div className="mt-2 flex items-center gap-0.5 border-t border-slate-700/60 pt-2">
                      <form action={moveCard.bind(null, card.id, "prev")}>
                        <button className={iconBtn} disabled={colIndex === 0}>
                          ◀
                        </button>
                      </form>
                      <form action={moveCard.bind(null, card.id, "up")}>
                        <button className={iconBtn} disabled={cardIndex === 0}>
                          ▲
                        </button>
                      </form>
                      <form action={moveCard.bind(null, card.id, "down")}>
                        <button
                          className={iconBtn}
                          disabled={cardIndex === column.cards.length - 1}
                        >
                          ▼
                        </button>
                      </form>
                      <form action={moveCard.bind(null, card.id, "next")}>
                        <button
                          className={iconBtn}
                          disabled={colIndex === columns.length - 1}
                        >
                          ▶
                        </button>
                      </form>
                      <details className="group relative ml-auto">
                        <summary className={`${iconBtn} list-none`}>✎</summary>
                        <form
                          action={updateCard.bind(null, card.id)}
                          className="absolute right-0 z-10 mt-1 w-60 space-y-2 rounded-lg border border-slate-700 bg-slate-900 p-2"
                        >
                          <input
                            name="title"
                            defaultValue={card.title}
                            required
                            className={inputClass}
                          />
                          <textarea
                            name="description"
                            defaultValue={card.description ?? ""}
                            rows={3}
                            placeholder="Descrição"
                            className={inputClass}
                          />
                          <button className={iconBtn}>Salvar</button>
                        </form>
                      </details>
                      <form action={archiveCard.bind(null, card.id)}>
                        <button className={`${iconBtn} hover:text-red-400`}>
                          🗑
                        </button>
                      </form>
                    </div>
                  )}
                </article>
              ))}
            </div>

            {canWrite && (
              <form
                action={createCard.bind(null, column.id)}
                className="border-t border-slate-800 p-2"
              >
                <input
                  name="title"
                  required
                  placeholder="+ Novo card"
                  className={inputClass}
                />
              </form>
            )}
          </section>
        ))}

        {canWrite && (
          <form
            action={createColumn.bind(null, boardId)}
            className="w-72 shrink-0"
          >
            <input
              name="name"
              required
              placeholder="+ Nova coluna"
              className={inputClass}
            />
          </form>
        )}
      </div>
    </main>
  );
}
