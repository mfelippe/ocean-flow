import Link from "next/link";

type CardVM = { id: string; title: string; dueDate: string | null };

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/** Visão calendário: cards posicionados pelo prazo (dueDate) no mês atual. */
export function BoardCalendarView({
  cards,
  slug,
  boardId,
}: {
  cards: CardVM[];
  slug: string;
  boardId: string;
}) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const monthLabel = now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = firstDay.getDay();

  // Agrupa cards do mês por dia (1..31).
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

  // Células: espaços vazios antes do dia 1, depois os dias do mês.
  const cells: (number | null)[] = [
    ...Array(startWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  const todayDate = now.getDate();

  return (
    <div className="p-6">
      <h2 className="mb-3 text-sm font-semibold capitalize text-ink">{monthLabel}</h2>

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
                    day === todayDate
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
