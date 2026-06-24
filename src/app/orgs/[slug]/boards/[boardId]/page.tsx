import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getBoardContext } from "@/lib/authz";
import { archiveBoard, renameBoard } from "@/app/actions/boards";
import { BoardBody } from "@/components/board-body";
import {
  BoardViewSwitcher,
  type BoardView,
} from "@/components/board-view-switcher";
import { BoardListView } from "@/components/board-list-view";
import { BoardTableView } from "@/components/board-table-view";
import { BoardCalendarView } from "@/components/board-calendar-view";
import { BoardMetricsSheet } from "@/components/board-metrics-sheet";
import { UserMenu } from "@/components/user-menu";
import { ConfirmButton } from "@/components/confirm-button";
import { inputClass } from "@/components/form";

const VALID_VIEWS: BoardView[] = ["kanban", "list", "table", "calendar"];

export default async function BoardPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; boardId: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const { slug, boardId } = await params;
  const { view: viewParam } = await searchParams;
  const view: BoardView = VALID_VIEWS.includes(viewParam as BoardView)
    ? (viewParam as BoardView)
    : "kanban";
  const { board, role, user } = await getBoardContext(boardId);
  if (board.organization.slug !== slug || board.archivedAt) notFound();

  const canWrite = role !== "VIEWER";
  const canManage = role === "OWNER" || role === "ADMIN";

  const [columns, boardFields] = await Promise.all([
    prisma.column.findMany({
      where: { boardId },
      orderBy: { rank: "asc" },
      include: {
        cards: {
          where: { archivedAt: null },
          orderBy: { rank: "asc" },
          include: {
            assignee: { select: { id: true, name: true } },
            labels: { include: { label: true } },
            fieldValues: { include: { field: true } },
            _count: { select: { attachments: true } },
          },
        },
      },
    }),
    prisma.customField.findMany({
      where: { boardId },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true },
    }),
  ]);

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
      assignee: card.assignee ? { name: card.assignee.name } : null,
    })),
  }));

  // Lista achatada (para a visão de tabela), com valores dos campos por card.
  const allCards = columns.flatMap((c) =>
    c.cards.map((card) => ({
      id: card.id,
      title: card.title,
      columnName: c.name,
      dueDate: card.dueDate ? card.dueDate.toISOString() : null,
      assignee: card.assignee?.name ?? null,
      fields: Object.fromEntries(
        card.fieldValues.map((fv) => [fv.field.name, fv.value]),
      ) as Record<string, string>,
    })),
  );

  // Métricas simples do quadro (cards ativos).
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const byAssigneeMap = new Map<string, number>();
  for (const c of allCards) {
    const key = c.assignee ?? "Sem responsável";
    byAssigneeMap.set(key, (byAssigneeMap.get(key) ?? 0) + 1);
  }
  const metrics = {
    total: allCards.length,
    byColumn: initialColumns.map((c) => ({ name: c.name, count: c.cards.length })),
    byAssignee: [...byAssigneeMap.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
    overdue: allCards.filter((c) => c.dueDate && new Date(c.dueDate) < startOfToday)
      .length,
    noDue: allCards.filter((c) => !c.dueDate).length,
  };

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
              ⚙️ Configurações
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

      <div className="flex items-center justify-between border-b border-edge px-6 py-2">
        <BoardViewSwitcher
          basePath={`/orgs/${slug}/boards/${boardId}`}
          current={view}
        />
        <BoardMetricsSheet metrics={metrics} />
      </div>

      {view === "kanban" ? (
        <BoardBody
          initialColumns={initialColumns}
          canWrite={canWrite}
          boardId={boardId}
          slug={slug}
        />
      ) : (
        <div className="flex-1 overflow-auto">
          {view === "list" && (
            <BoardListView columns={initialColumns} slug={slug} boardId={boardId} />
          )}
          {view === "table" && (
            <BoardTableView
              cards={allCards}
              customFields={boardFields}
              slug={slug}
              boardId={boardId}
            />
          )}
          {view === "calendar" && (
            <BoardCalendarView cards={allCards} slug={slug} boardId={boardId} />
          )}
        </div>
      )}
    </main>
  );
}
