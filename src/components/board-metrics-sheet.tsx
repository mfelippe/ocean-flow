"use client";

import { BarChart3 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";

export type BoardMetrics = {
  total: number;
  byColumn: { name: string; count: number }[];
  byAssignee: { name: string; count: number }[];
  overdue: number;
  noDue: number;
};

function Bar({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="truncate text-ink">{label}</span>
        <span className="shrink-0 text-subtle">{count}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-edge">
        <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function BoardMetricsSheet({ metrics }: { metrics: BoardMetrics }) {
  const { total, byColumn, byAssignee, overdue, noDue } = metrics;

  return (
    <Sheet>
      <SheetTrigger className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-muted hover:bg-edge hover:text-ink">
        <BarChart3 className="size-3.5" />
        Métricas
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Métricas do quadro</SheetTitle>
          <SheetDescription>Resumo dos cards ativos.</SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-6 overflow-y-auto">
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg border border-edge bg-surface/50 p-3 text-center">
              <p className="text-xl font-bold text-ink">{total}</p>
              <p className="text-[11px] text-muted">Cards</p>
            </div>
            <div className="rounded-lg border border-edge bg-surface/50 p-3 text-center">
              <p className="text-xl font-bold text-ink">{overdue}</p>
              <p className="text-[11px] text-muted">Atrasados</p>
            </div>
            <div className="rounded-lg border border-edge bg-surface/50 p-3 text-center">
              <p className="text-xl font-bold text-ink">{noDue}</p>
              <p className="text-[11px] text-muted">Sem prazo</p>
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-subtle">
              Por coluna
            </h3>
            <div className="space-y-2.5">
              {byColumn.map((c) => (
                <Bar key={c.name} label={c.name} count={c.count} total={total} />
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-subtle">
              Por responsável
            </h3>
            <div className="space-y-2.5">
              {byAssignee.map((a) => (
                <Bar key={a.name} label={a.name} count={a.count} total={total} />
              ))}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
