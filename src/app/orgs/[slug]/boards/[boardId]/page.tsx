import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getBoardContext } from "@/lib/authz";
import { archiveBoard, renameBoard } from "@/app/actions/boards";
import { BoardBody } from "@/components/board-body";
import { UserMenu } from "@/components/user-menu";
import { ConfirmButton } from "@/components/confirm-button";
import { inputClass } from "@/components/form";

export default async function BoardPage({
  params,
}: {
  params: Promise<{ slug: string; boardId: string }>;
}) {
  const { slug, boardId } = await params;
  const { board, role, user } = await getBoardContext(boardId);
  if (board.organization.slug !== slug || board.archivedAt) notFound();

  const canWrite = role !== "VIEWER";
  const canManage = role === "OWNER" || role === "ADMIN";

  const columns = await prisma.column.findMany({
    where: { boardId },
    orderBy: { rank: "asc" },
    include: {
      cards: {
        where: { archivedAt: null },
        orderBy: { rank: "asc" },
        include: {
          labels: { include: { label: true } },
          _count: { select: { attachments: true } },
        },
      },
    },
  });

  const initialColumns = columns.map((c) => ({
    id: c.id,
    name: c.name,
    rank: c.rank,
    cards: c.cards.map((card) => ({
      id: card.id,
      title: card.title,
      description: card.description,
      rank: card.rank,
      dueDate: card.dueDate ? card.dueDate.toISOString() : null,
      labels: card.labels.map((cl) => ({
        id: cl.label.id,
        name: cl.label.name,
        color: cl.label.color,
      })),
      attachmentCount: card._count.attachments,
    })),
  }));

  return (
    <main className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b border-edge px-6 py-4">
        <div className="flex items-center gap-4">
          <Link
            href={`/orgs/${slug}`}
            className="text-sm text-muted hover:text-brand"
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
                className="absolute z-20 mt-2 flex gap-2 rounded-lg border border-edge bg-elevated p-2"
              >
                <input
                  name="name"
                  defaultValue={board.name}
                  required
                  className={inputClass}
                />
                <button className="rounded px-2 py-0.5 text-xs text-ink hover:bg-edge">
                  Salvar
                </button>
              </form>
            </details>
          ) : (
            <h1 className="text-lg font-bold">{board.name}</h1>
          )}
        </div>
        <div className="flex items-center gap-4">
          {canManage && (
            <Link
              href={`/orgs/${slug}/boards/${boardId}/settings`}
              className="text-xs text-muted hover:text-brand"
            >
              Acesso
            </Link>
          )}
          {canWrite && (
            <ConfirmButton
              action={archiveBoard.bind(null, boardId)}
              triggerClassName="text-xs text-subtle hover:text-red-400"
              title="Arquivar quadro?"
              description={`O quadro "${board.name}" será arquivado e sairá da lista da organização.`}
              confirmLabel="Arquivar quadro"
            >
              Arquivar quadro
            </ConfirmButton>
          )}
          <UserMenu name={user.name ?? ""} email={user.email ?? ""} />
        </div>
      </header>

      <BoardBody
        initialColumns={initialColumns}
        canWrite={canWrite}
        boardId={boardId}
        slug={slug}
      />
    </main>
  );
}
