import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

type CardVM = { id: string; title: string; dueDate: string | null };

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function ym(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

/** Visão calendário: cards posicionados pelo prazo (dueDate), com navegação de meses. */
export function BoardCalendarView({
  cards,
  slug,
  boardId,
  year,
  month,
  basePath,
}: {
  cards: CardVM[];
  slug: string;
  boardId: string;
  year: number;
  month: number; // 0-11
  basePath: string;
}) {
  const monthLabel = new Date(year, month, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = new Date(year, month, 1).getDay();

  // Mês anterior / próximo (para os links de navegação).
  const prev = month === 0 ? { y: year - 1, m: 11 } : { y: year, m: month - 1 };
  const next = month === 11 ? { y: year + 1, m: 0 } : { y: year, m: month + 1 };
  const link = (y: number, m: number) => `${basePath}?view=calendar&ym=${ym(y, m)}`;

  // Hoje (para destacar apenas quando o mês exibido é o atual).
  const today = new Date();
  const isCurrentMonth =
    today.getFullYear() === year && today.getMonth() === month;
  const todayDate = today.getDate();

  // Agrupa cards do mês exibido por dia.
  const byDay = new Map<number, CardVM[]>();
  const noDate: CardVM[] = [];
  for (const c of cards) {
    if (!c.dueDate) {
      noDate.push(c);
      continue;
    }
    const d = new Date(c.dueDate);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      (byDay.get(day) ?? byDay.set(day, []).get(day)!).push(c);
    }
  }

  const cells: (number | null)[] = [
    ...Array(startWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="p-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold capitalize text-ink">{monthLabel}</h2>
        <div className="flex items-center gap-1">
          <Link
            href={link(prev.y, prev.m)}
            aria-label="Mês anterior"
            className="inline-flex items-center rounded-lg border border-edge px-2 py-1 text-ink hover:bg-edge"
          >
            <ChevronLeft className="size-4" />
          </Link>
          {!isCurrentMonth && (
            <Link
              href={`${basePath}?view=calendar`}
              className="rounded-lg border border-edge px-2.5 py-1 text-xs text-muted hover:bg-edge hover:text-ink"
            >
              Hoje
            </Link>
          )}
          <Link
            href={link(next.y, next.m)}
            aria-label="Próximo mês"
            className="inline-flex items-center rounded-lg border border-edge px-2 py-1 text-ink hover:bg-edge"
          >
            <ChevronRight className="size-4" />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-edge bg-edge text-xs">
        {WEEKDAYS.map((w) => (
          <div key={w} className="bg-panel px-2 py-1.5 text-center font-medium text-subtle">
            {w}
          </div>
        ))}
        {cells.map((day, i) => (
          <div key={i} className="min-h-24 bg-panel/60 p-1.5">
            {day && (
              <>
                <span
                  className={`mb-1 inline-flex size-5 items-center justify-center rounded-full text-[11px] ${
                    isCurrentMonth && day === todayDate
                      ? "bg-brand font-semibold text-brand-ink"
                      : "text-muted"
                  }`}
                >
                  {day}
                </span>
                <div className="space-y-1">
                  {(byDay.get(day) ?? []).map((c) => (
                    <Link
                      key={c.id}
                      href={`/orgs/${slug}/boards/${boardId}/cards/${c.id}`}
                      className="block truncate rounded bg-elevated px-1.5 py-0.5 text-[11px] text-ink hover:bg-edge"
                      title={c.title}
                    >
                      {c.title}
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {noDate.length > 0 && (
        <p className="mt-3 text-xs text-subtle">
          {noDate.length} card(s) sem prazo não aparecem no calendário.
        </p>
      )}
    </div>
  );
}
