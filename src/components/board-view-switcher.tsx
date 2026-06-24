import Link from "next/link";
import { LayoutGrid, List, Table2, Calendar } from "lucide-react";

export type BoardView = "kanban" | "list" | "table" | "calendar";

const VIEWS: { key: BoardView; label: string; Icon: typeof List }[] = [
  { key: "kanban", label: "Kanban", Icon: LayoutGrid },
  { key: "list", label: "Lista", Icon: List },
  { key: "table", label: "Tabela", Icon: Table2 },
  { key: "calendar", label: "Calendário", Icon: Calendar },
];

/** Alterna o modo de visualização do quadro via ?view= (estilo Plane.so). */
export function BoardViewSwitcher({
  basePath,
  current,
}: {
  basePath: string;
  current: BoardView;
}) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-edge bg-panel/60 p-1">
      {VIEWS.map(({ key, label, Icon }) => {
        const active = key === current;
        const href = key === "kanban" ? basePath : `${basePath}?view=${key}`;
        return (
          <Link
            key={key}
            href={href}
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              active
                ? "bg-brand text-brand-ink"
                : "text-muted hover:bg-edge hover:text-ink"
            }`}
          >
            <Icon className="size-3.5" />
            {label}
          </Link>
        );
      })}
    </div>
  );
}
