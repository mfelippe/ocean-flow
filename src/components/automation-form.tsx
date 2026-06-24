"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { FormState } from "@/app/actions/automations";
import {
  FormError,
  FormSuccess,
  SubmitButton,
  inputClass,
  labelClass,
} from "@/components/form";

type ColumnVM = { id: string; name: string };
type LabelVM = { id: string; name: string };
type BoardVM = { id: string; name: string; columns: ColumnVM[] };
type Action = (prev: FormState, fd: FormData) => Promise<FormState>;

type ActionType =
  | "MOVE_CARD"
  | "CREATE_CARD"
  | "ADD_LABEL"
  | "REMOVE_LABEL"
  | "ADD_COMMENT"
  | "HTTP_REQUEST";

type ActionRow = {
  type: ActionType;
  columnId: string;
  labelId: string;
  body: string;
  method: "GET" | "POST";
  url: string;
  headersText: string;
  httpBody: string;
  targetBoardId: string;
  targetColumnId: string;
  cardTitle: string;
  cardDescription: string;
};

function emptyRow(): ActionRow {
  return {
    type: "ADD_COMMENT",
    columnId: "",
    labelId: "",
    body: "",
    method: "POST",
    url: "",
    headersText: "",
    httpBody: "",
    targetBoardId: "",
    targetColumnId: "",
    cardTitle: "",
    cardDescription: "",
  };
}

const ACTION_LABEL: Record<ActionType, string> = {
  MOVE_CARD: "Mover card para coluna",
  CREATE_CARD: "Criar card em outro quadro",
  ADD_LABEL: "Adicionar label",
  REMOVE_LABEL: "Remover label",
  ADD_COMMENT: "Adicionar comentário",
  HTTP_REQUEST: "Requisição HTTP",
};

// Converte "Chave: valor" por linha em objeto. Linhas vazias são ignoradas.
function parseHeaders(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const i = line.indexOf(":");
    if (i === -1) continue;
    const k = line.slice(0, i).trim();
    const v = line.slice(i + 1).trim();
    if (k) out[k] = v;
  }
  return out;
}

// Serializa as linhas no formato esperado pelo automationActionSchema.
function serialize(rows: ActionRow[]): unknown[] {
  return rows.map((r) => {
    switch (r.type) {
      case "MOVE_CARD":
        return { type: r.type, columnId: r.columnId };
      case "CREATE_CARD": {
        const action: Record<string, unknown> = {
          type: r.type,
          boardId: r.targetBoardId,
          columnId: r.targetColumnId,
          title: r.cardTitle,
        };
        if (r.cardDescription) action.description = r.cardDescription;
        return action;
      }
      case "ADD_LABEL":
      case "REMOVE_LABEL":
        return { type: r.type, labelId: r.labelId };
      case "ADD_COMMENT":
        return { type: r.type, body: r.body };
      case "HTTP_REQUEST": {
        const headers = parseHeaders(r.headersText);
        const action: Record<string, unknown> = {
          type: r.type,
          method: r.method,
          url: r.url,
        };
        if (Object.keys(headers).length > 0) action.headers = headers;
        if (r.method === "POST" && r.httpBody) action.body = r.httpBody;
        return action;
      }
    }
  });
}

export function AutomationForm({
  action,
  columns,
  labels,
  boards,
}: {
  action: Action;
  columns: ColumnVM[];
  labels: LabelVM[];
  boards: BoardVM[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState<FormState, FormData>(
    action,
    undefined,
  );
  const [trigger, setTrigger] = useState<
    "CARD_CREATED" | "CARD_MOVED_TO_COLUMN"
  >("CARD_MOVED_TO_COLUMN");
  const [triggerColumnId, setTriggerColumnId] = useState("");
  const [rows, setRows] = useState<ActionRow[]>([emptyRow()]);

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      setTrigger("CARD_MOVED_TO_COLUMN");
      setTriggerColumnId("");
      setRows([emptyRow()]);
    }
  }, [state]);

  function patchRow(i: number, patch: Partial<ActionRow>) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-4 rounded-xl border border-edge bg-panel/60 p-4">
      <FormError message={state?.error} />
      {state?.ok && <FormSuccess message="Automação criada." />}

      <div className="space-y-0.5">
        <label htmlFor="auto-name" className={labelClass}>Nome</label>
        <input id="auto-name" name="name" required placeholder="Ex.: Avisar BotConversa" className={inputClass} />
      </div>

      {/* ── Gatilho ── */}
      <div className="space-y-2">
        <p className={labelClass}>Quando…</p>
        <select
          name="trigger"
          value={trigger}
          onChange={(e) => setTrigger(e.target.value as typeof trigger)}
          className={inputClass}
        >
          <option value="CARD_MOVED_TO_COLUMN">Card for movido para uma coluna</option>
          <option value="CARD_CREATED">Card for criado</option>
        </select>
        <select
          name="triggerColumnId"
          value={triggerColumnId}
          onChange={(e) => setTriggerColumnId(e.target.value)}
          className={inputClass}
        >
          <option value="">
            {trigger === "CARD_CREATED" ? "Em qualquer coluna" : "Escolha a coluna…"}
          </option>
          {columns.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* ── Ações ── */}
      <div className="space-y-3">
        <p className={labelClass}>Faça…</p>
        {rows.map((row, i) => (
          <div key={i} className="space-y-2 rounded-lg border border-edge bg-surface/50 p-3">
            <div className="flex items-center gap-2">
              <select
                value={row.type}
                onChange={(e) => patchRow(i, { type: e.target.value as ActionType })}
                className={inputClass}
              >
                {(Object.keys(ACTION_LABEL) as ActionType[]).map((t) => (
                  <option key={t} value={t}>{ACTION_LABEL[t]}</option>
                ))}
              </select>
              {rows.length > 1 && (
                <button
                  type="button"
                  onClick={() => setRows((rs) => rs.filter((_, idx) => idx !== i))}
                  className="shrink-0 rounded-lg border border-edge px-2 py-2 text-xs text-subtle hover:text-red-400"
                >
                  remover
                </button>
              )}
            </div>

            {row.type === "MOVE_CARD" && (
              <select value={row.columnId} onChange={(e) => patchRow(i, { columnId: e.target.value })} className={inputClass}>
                <option value="">Escolha a coluna…</option>
                {columns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}

            {row.type === "CREATE_CARD" && (
              <div className="space-y-2">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <select
                    value={row.targetBoardId}
                    onChange={(e) => patchRow(i, { targetBoardId: e.target.value, targetColumnId: "" })}
                    className={inputClass}
                  >
                    <option value="">Escolha o quadro…</option>
                    {boards.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                  <select
                    value={row.targetColumnId}
                    onChange={(e) => patchRow(i, { targetColumnId: e.target.value })}
                    className={inputClass}
                    disabled={!row.targetBoardId}
                  >
                    <option value="">Escolha a coluna…</option>
                    {boards.find((b) => b.id === row.targetBoardId)?.columns.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <input
                  value={row.cardTitle}
                  onChange={(e) => patchRow(i, { cardTitle: e.target.value })}
                  placeholder="Título do novo card. Ex.: Follow-up: {{card.title}}"
                  className={inputClass}
                />
                <textarea
                  value={row.cardDescription}
                  onChange={(e) => patchRow(i, { cardDescription: e.target.value })}
                  rows={2}
                  placeholder="Descrição (opcional). Use {{field.Telefone}}, {{card.url}}…"
                  className={inputClass}
                />
              </div>
            )}

            {(row.type === "ADD_LABEL" || row.type === "REMOVE_LABEL") && (
              <select value={row.labelId} onChange={(e) => patchRow(i, { labelId: e.target.value })} className={inputClass}>
                <option value="">Escolha a label…</option>
                {labels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            )}

            {row.type === "ADD_COMMENT" && (
              <textarea
                value={row.body}
                onChange={(e) => patchRow(i, { body: e.target.value })}
                rows={2}
                placeholder="Texto do comentário. Use {{card.title}}, {{field.Telefone}}…"
                className={inputClass}
              />
            )}

            {row.type === "HTTP_REQUEST" && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <select
                    value={row.method}
                    onChange={(e) => patchRow(i, { method: e.target.value as "GET" | "POST" })}
                    className={`${inputClass} w-28 shrink-0`}
                  >
                    <option value="POST">POST</option>
                    <option value="GET">GET</option>
                  </select>
                  <input
                    value={row.url}
                    onChange={(e) => patchRow(i, { url: e.target.value })}
                    placeholder="https://api.exemplo.com/…"
                    className={inputClass}
                  />
                </div>
                <textarea
                  value={row.headersText}
                  onChange={(e) => patchRow(i, { headersText: e.target.value })}
                  rows={2}
                  placeholder="Headers, um por linha — Ex.:&#10;API-KEY: seu-token"
                  className={inputClass}
                />
                {row.method === "POST" && (
                  <textarea
                    value={row.httpBody}
                    onChange={(e) => patchRow(i, { httpBody: e.target.value })}
                    rows={3}
                    placeholder={'Body (JSON). Ex.: {"phone": "{{field.Telefone}}"}'}
                    className={inputClass}
                  />
                )}
              </div>
            )}
          </div>
        ))}

        <button
          type="button"
          onClick={() => setRows((rs) => [...rs, emptyRow()])}
          className="rounded-lg border border-edge px-3 py-1.5 text-xs text-ink hover:bg-edge"
        >
          + adicionar ação
        </button>
      </div>

      {/* Campo oculto serializado com as ações */}
      <input type="hidden" name="actions" value={JSON.stringify(serialize(rows))} />

      <p className="text-xs text-subtle">
        Variáveis disponíveis no comentário e na requisição:{" "}
        <code className="text-muted">{"{{card.title}}"}</code>,{" "}
        <code className="text-muted">{"{{card.url}}"}</code>,{" "}
        <code className="text-muted">{"{{column.name}}"}</code>,{" "}
        <code className="text-muted">{"{{field.NomeDoCampo}}"}</code>.
      </p>

      <SubmitButton pendingLabel="Criando…">Criar automação</SubmitButton>
    </form>
  );
}
