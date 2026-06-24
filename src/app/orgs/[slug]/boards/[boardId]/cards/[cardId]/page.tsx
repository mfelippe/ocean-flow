import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getBoardContext } from "@/lib/authz";
import {
  addComment,
  createLabel,
  deleteComment,
  setDueDate,
  toggleCardLabel,
  updateCardContent,
} from "@/app/actions/cards";
import {
  deleteAttachment,
  uploadAttachment,
} from "@/app/actions/attachments";
import { CardContent } from "@/components/card-content";
import { AddCommentForm } from "@/components/add-comment-form";
import { CreateLabelForm } from "@/components/create-label-form";
import { AttachmentForm } from "@/components/attachment-form";
import { ConfirmButton } from "@/components/confirm-button";
import { setCardFields } from "@/app/actions/custom-fields";
import { CardFieldsForm } from "@/components/card-fields-form";
import { AssigneePicker } from "@/components/assignee-picker";
import { inputClass } from "@/components/form";

function activityText(type: string, payload: unknown): string {
  const p = (payload ?? {}) as Record<string, unknown>;
  switch (type) {
    case "CARD_CREATED":
      return "criou o card";
    case "CARD_MOVED":
      return `moveu de "${p.from}" para "${p.to}"`;
    case "CARD_UPDATED":
      return "editou o card";
    case "CARD_ARCHIVED":
      return "arquivou o card";
    case "COMMENT_ADDED":
      return "comentou";
    case "ATTACHMENT_ADDED":
      return `anexou "${p.name}"`;
    default:
      return type;
  }
}

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function fmt(d: Date): string {
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export default async function CardPage({
  params,
}: {
  params: Promise<{ slug: string; boardId: string; cardId: string }>;
}) {
  const { slug, boardId, cardId } = await params;
  const { role, board } = await getBoardContext(boardId);
  if (board.organization.slug !== slug) notFound();

  const canWrite = role !== "VIEWER";
  const boardHref = `/orgs/${slug}/boards/${boardId}`;

  const card = await prisma.card.findUnique({
    where: { id: cardId },
    include: {
      column: true,
      assignee: { select: { id: true, name: true } },
      labels: { include: { label: true } },
      comments: { include: { author: true }, orderBy: { createdAt: "desc" } },
      attachments: { orderBy: { createdAt: "desc" } },
      fieldValues: true,
    },
  });
  if (!card || card.column.boardId !== boardId) notFound();

  // Candidatos a responsável: membros da organização do quadro.
  const orgMembers = await prisma.membership.findMany({
    where: { organizationId: board.organizationId },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });
  const memberOptions = orgMembers.map((m) => ({ id: m.user.id, name: m.user.name }));

  const boardLabels = await prisma.label.findMany({
    where: { boardId },
    orderBy: { name: "asc" },
  });
  const customFields = await prisma.customField.findMany({
    where: { boardId },
    orderBy: { createdAt: "asc" },
  });
  const fieldVMs = customFields.map((f) => ({
    id: f.id,
    name: f.name,
    type: f.type,
    value: card.fieldValues.find((v) => v.fieldId === f.id)?.value ?? "",
  }));
  const activities = await prisma.activity.findMany({
    where: { cardId },
    include: { actor: true },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  const assigned = new Set(card.labels.map((cl) => cl.labelId));
  const dueValue = card.dueDate ? card.dueDate.toISOString().slice(0, 10) : "";

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <Link href={boardHref} className="text-sm text-muted hover:text-brand">
        ← {card.column.name}
      </Link>

      <div className="mt-4 grid gap-8 md:grid-cols-[1fr_18rem]">
        {/* Coluna principal */}
        <div className="space-y-8">
          <CardContent
            title={card.title}
            description={card.description}
            canWrite={canWrite}
            action={updateCardContent.bind(null, cardId)}
          />

          <section>
            <h2 className="mb-3 text-sm font-semibold text-ink">
              Anexos ({card.attachments.length})
            </h2>
            {canWrite && (
              <div className="mb-4">
                <AttachmentForm action={uploadAttachment.bind(null, cardId)} />
              </div>
            )}
            <ul className="space-y-2">
              {card.attachments.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-edge bg-panel px-3 py-2"
                >
                  <a
                    href={`/api/attachments/${a.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-w-0 flex-1 truncate text-sm text-brand hover:underline"
                  >
                    📎 {a.fileName}
                  </a>
                  <span className="shrink-0 text-xs text-subtle">
                    {fmtSize(a.size)}
                  </span>
                  {canWrite && (
                    <ConfirmButton
                      action={deleteAttachment.bind(null, a.id)}
                      triggerClassName="text-xs text-subtle hover:text-red-400"
                      title="Remover anexo?"
                      description={`"${a.fileName}" será excluído permanentemente.`}
                      confirmLabel="Remover"
                    >
                      remover
                    </ConfirmButton>
                  )}
                </li>
              ))}
              {card.attachments.length === 0 && (
                <li className="text-sm text-subtle">Nenhum anexo.</li>
              )}
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold text-ink">
              Comentários ({card.comments.length})
            </h2>
            {canWrite && (
              <div className="mb-4">
                <AddCommentForm action={addComment.bind(null, cardId)} />
              </div>
            )}
            <ul className="space-y-3">
              {card.comments.map((c) => (
                <li
                  key={c.id}
                  className="rounded-lg border border-edge bg-panel p-3"
                >
                  <div className="flex items-center justify-between text-xs text-subtle">
                    <span className="font-medium text-ink">
                      {c.author?.name ?? "—"}
                    </span>
                    <span>{fmt(c.createdAt)}</span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{c.body}</p>
                  {canWrite && (
                    <div className="mt-1 text-right">
                      <ConfirmButton
                        action={deleteComment.bind(null, c.id)}
                        triggerClassName="text-xs text-subtle hover:text-red-400"
                        title="Remover comentário?"
                        description="O comentário será excluído permanentemente."
                        confirmLabel="Remover"
                      >
                        remover
                      </ConfirmButton>
                    </div>
                  )}
                </li>
              ))}
              {card.comments.length === 0 && (
                <li className="text-sm text-subtle">Nenhum comentário ainda.</li>
              )}
            </ul>
          </section>
        </div>

        {/* Barra lateral */}
        <aside className="space-y-6">
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-subtle">
              Responsável
            </h3>
            <AssigneePicker
              cardId={cardId}
              members={memberOptions}
              currentId={card.assignee?.id ?? null}
              currentName={card.assignee?.name ?? null}
              canWrite={canWrite}
            />
          </section>

          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-subtle">
              Labels
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {boardLabels.map((l) => {
                const on = assigned.has(l.id);
                return canWrite ? (
                  <form
                    key={l.id}
                    action={toggleCardLabel.bind(null, cardId, l.id)}
                  >
                    <button
                      className="rounded px-2 py-1 text-xs font-medium text-white transition"
                      style={{ backgroundColor: l.color, opacity: on ? 1 : 0.35 }}
                      title={on ? "Remover" : "Adicionar"}
                    >
                      {on ? "✓ " : ""}
                      {l.name}
                    </button>
                  </form>
                ) : (
                  on && (
                    <span
                      key={l.id}
                      className="rounded px-2 py-1 text-xs font-medium text-white"
                      style={{ backgroundColor: l.color }}
                    >
                      {l.name}
                    </span>
                  )
                );
              })}
              {boardLabels.length === 0 && (
                <p className="text-xs text-subtle">Nenhuma label no quadro.</p>
              )}
            </div>
            {canWrite && (
              <div className="mt-3">
                <CreateLabelForm action={createLabel.bind(null, boardId)} />
              </div>
            )}
          </section>

          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-subtle">
              Prazo
            </h3>
            {canWrite ? (
              <form
                action={setDueDate.bind(null, cardId)}
                className="flex items-center gap-2"
              >
                <input
                  type="date"
                  name="dueDate"
                  defaultValue={dueValue}
                  className={inputClass}
                />
                <button className="shrink-0 rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-brand-ink hover:bg-brand-strong">
                  OK
                </button>
              </form>
            ) : (
              <p className="text-sm">
                {dueValue ? card.dueDate?.toLocaleDateString("pt-BR") : "—"}
              </p>
            )}
          </section>

          {fieldVMs.length > 0 && (
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-subtle">
                Campos
              </h3>
              <CardFieldsForm
                fields={fieldVMs}
                canWrite={canWrite}
                action={setCardFields.bind(null, cardId)}
              />
            </section>
          )}

          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-subtle">
              Atividade
            </h3>
            <ul className="space-y-2 text-xs text-muted">
              {activities.map((a) => (
                <li key={a.id}>
                  <span className="text-ink">{a.actor?.name ?? "Alguém"}</span>{" "}
                  {activityText(a.type, a.payload)}
                  <span className="block text-subtle">{fmt(a.createdAt)}</span>
                </li>
              ))}
              {activities.length === 0 && <li>Sem atividade.</li>}
            </ul>
          </section>
        </aside>
      </div>
    </main>
  );
}
