"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  getFirstCollision,
  pointerWithin,
  rectIntersection,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { generateKeyBetween } from "fractional-indexing";
import {
  archiveCard,
  createCard,
  createColumn,
  deleteColumn,
  moveCardTo,
  moveColumn,
  renameColumn,
  updateCard,
} from "@/app/actions/boards";
import { inputClass } from "@/components/form";

export type CardT = {
  id: string;
  title: string;
  description: string | null;
  rank: string;
};
export type ColumnT = {
  id: string;
  name: string;
  rank: string;
  cards: CardT[];
};

const iconBtn =
  "rounded px-1.5 py-0.5 text-xs text-slate-400 hover:bg-slate-700 hover:text-slate-100 disabled:opacity-30";

function signature(columns: ColumnT[]): string {
  return columns
    .map(
      (c) =>
        `${c.id}:${c.name}:${c.rank}|${c.cards
          .map((card) => `${card.id}:${card.rank}:${card.title}:${card.description ?? ""}`)
          .join(",")}`,
    )
    .join(";");
}

export function BoardBody({
  initialColumns,
  canWrite,
  boardId,
}: {
  initialColumns: ColumnT[];
  canWrite: boolean;
  boardId: string;
}) {
  const router = useRouter();
  const [columns, setColumns] = useState<ColumnT[]>(initialColumns);
  const columnsRef = useRef(columns);
  columnsRef.current = columns;
  const [activeCard, setActiveCard] = useState<CardT | null>(null);
  const [, startTransition] = useTransition();

  // Re-sincroniza com o servidor quando os dados mudam (criar/editar/arquivar).
  const initialSig = signature(initialColumns);
  useEffect(() => {
    setColumns(initialColumns);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSig]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function findColumn(id: string): ColumnT | undefined {
    const cols = columnsRef.current;
    return (
      cols.find((c) => c.id === id) ??
      cols.find((c) => c.cards.some((card) => card.id === id))
    );
  }

  // Detecção de colisão para múltiplas colunas: prioriza o que está sob o
  // ponteiro; se cair sobre uma coluna, escolhe o card mais próximo dentro dela.
  const collisionDetection: CollisionDetection = (args) => {
    const pointer = pointerWithin(args);
    const intersections = pointer.length > 0 ? pointer : rectIntersection(args);
    let overId = getFirstCollision(intersections, "id");

    if (overId != null) {
      const overColumn = columnsRef.current.find((c) => c.id === overId);
      if (overColumn && overColumn.cards.length > 0) {
        const cardIds = new Set(overColumn.cards.map((c) => c.id));
        const closest = closestCenter({
          ...args,
          droppableContainers: args.droppableContainers.filter(
            (c) => c.id !== overId && cardIds.has(String(c.id)),
          ),
        });
        if (closest.length > 0) overId = closest[0].id;
      }
      return [{ id: overId }];
    }
    return [];
  };

  function handleDragStart(event: DragStartEvent) {
    const id = String(event.active.id);
    const col = findColumn(id);
    setActiveCard(col?.cards.find((c) => c.id === id) ?? null);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);

    const activeCol = findColumn(activeId);
    const overCol = findColumn(overId);
    if (!activeCol || !overCol || activeCol.id === overCol.id) return;

    setColumns((prev) => {
      const from = prev.find((c) => c.id === activeCol.id);
      const to = prev.find((c) => c.id === overCol.id);
      if (!from || !to) return prev;

      const moved = from.cards.find((c) => c.id === activeId);
      if (!moved) return prev;

      // posição de inserção: sobre um card → seu índice; sobre a coluna → fim.
      const overIndex = to.cards.findIndex((c) => c.id === overId);
      const insertAt = overIndex >= 0 ? overIndex : to.cards.length;

      return prev.map((c) => {
        if (c.id === from.id) {
          return { ...c, cards: c.cards.filter((card) => card.id !== activeId) };
        }
        if (c.id === to.id) {
          const next = [...c.cards];
          next.splice(insertAt, 0, moved);
          return { ...c, cards: next };
        }
        return c;
      });
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveCard(null);
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    const cols = columnsRef.current;

    // Coluna de destino = onde o "over" está (estável, independe do
    // estado intermediário que o handleDragOver tenha aplicado).
    const targetCol =
      cols.find((c) => c.id === overId) ??
      cols.find((c) => c.cards.some((card) => card.id === overId));
    if (!targetCol) return;

    // Cards do destino sem o card ativo, para calcular vizinhos/posição.
    const others = targetCol.cards.filter((c) => c.id !== activeId);
    let insertAt: number;
    if (overId === targetCol.id) {
      insertAt = others.length; // soltou na área vazia da coluna
    } else {
      const overIdx = others.findIndex((c) => c.id === overId);
      insertAt = overIdx >= 0 ? overIdx : others.length;
    }

    const before = others[insertAt - 1]?.rank ?? null;
    const after = others[insertAt]?.rank ?? null;
    const newRank = generateKeyBetween(before, after);

    // Estado otimista final: remove o ativo de onde estiver e o insere
    // na coluna de destino na posição calculada.
    setColumns((prev) => {
      let moved: CardT | undefined;
      const removed = prev.map((c) => {
        const found = c.cards.find((x) => x.id === activeId);
        if (found) moved = { ...found, rank: newRank };
        return { ...c, cards: c.cards.filter((x) => x.id !== activeId) };
      });
      if (!moved) return prev;
      return removed.map((c) => {
        if (c.id !== targetCol.id) return c;
        const next = [...c.cards];
        next.splice(insertAt, 0, moved!);
        return { ...c, cards: next };
      });
    });

    startTransition(async () => {
      try {
        await moveCardTo(activeId, targetCol.id, newRank);
      } catch {
        router.refresh(); // desfaz o otimismo em caso de erro
      }
    });
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-1 gap-4 overflow-x-auto p-6">
        {columns.map((column, colIndex) => (
          <ColumnView
            key={column.id}
            column={column}
            colIndex={colIndex}
            total={columns.length}
            canWrite={canWrite}
          />
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

      <DragOverlay>
        {activeCard ? (
          <div className="rounded-lg border border-teal-400 bg-slate-800 p-2.5 text-sm shadow-lg">
            {activeCard.title}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function ColumnView({
  column,
  colIndex,
  total,
  canWrite,
}: {
  column: ColumnT;
  colIndex: number;
  total: number;
  canWrite: boolean;
}) {
  // A coluna inteira é uma zona de drop (inclusive quando vazia).
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { type: "column" },
  });

  return (
    <section className="flex max-h-full w-72 shrink-0 flex-col rounded-xl border border-slate-800 bg-slate-900/40">
      <div className="flex items-center justify-between gap-2 border-b border-slate-800 px-3 py-2">
        {canWrite ? (
          <details className="group relative min-w-0 flex-1">
            <summary className="cursor-pointer list-none truncate text-sm font-semibold">
              {column.name}
            </summary>
            <form
              action={renameColumn.bind(null, column.id)}
              className="absolute z-20 mt-2 flex gap-2 rounded-lg border border-slate-700 bg-slate-900 p-2"
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
          <span className="truncate text-sm font-semibold">{column.name}</span>
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
              <button className={iconBtn} disabled={colIndex === total - 1}>
                ▶
              </button>
            </form>
            <form action={deleteColumn.bind(null, column.id)}>
              <button className={`${iconBtn} hover:text-red-400`}>✕</button>
            </form>
          </div>
        )}
      </div>

      <SortableContext
        items={column.cards.map((c) => c.id)}
        strategy={verticalListSortingStrategy}
      >
        <div
          ref={setNodeRef}
          className={`flex-1 space-y-2 overflow-y-auto p-2 ${
            isOver ? "bg-teal-500/5" : ""
          }`}
        >
          {column.cards.map((card) => (
            <SortableCard key={card.id} card={card} canWrite={canWrite} />
          ))}
          {column.cards.length === 0 && (
            <p className="px-1 py-6 text-center text-xs text-slate-600">
              Solte cards aqui
            </p>
          )}
        </div>
      </SortableContext>

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
  );
}

function SortableCard({ card, canWrite }: { card: CardT; canWrite: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id, data: { type: "card" } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      className="rounded-lg border border-slate-700 bg-slate-800/70 p-2.5"
    >
      <div
        {...(canWrite ? { ...attributes, ...listeners } : {})}
        className={canWrite ? "cursor-grab touch-none active:cursor-grabbing" : ""}
      >
        <p className="text-sm">{card.title}</p>
        {card.description && (
          <p className="mt-1 line-clamp-3 text-xs text-slate-400">
            {card.description}
          </p>
        )}
      </div>

      {canWrite && (
        <div className="mt-2 flex items-center justify-end gap-0.5 border-t border-slate-700/60 pt-2">
          <details className="group relative">
            <summary className={`${iconBtn} list-none`}>✎</summary>
            <form
              action={updateCard.bind(null, card.id)}
              className="absolute right-0 z-20 mt-1 w-60 space-y-2 rounded-lg border border-slate-700 bg-slate-900 p-2"
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
            <button className={`${iconBtn} hover:text-red-400`}>🗑</button>
          </form>
        </div>
      )}
    </article>
  );
}
