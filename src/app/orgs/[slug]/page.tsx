import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { addMember } from "@/app/actions/organizations";
import { createBoard } from "@/app/actions/boards";
import {
  createWebhook,
  deleteWebhook,
  toggleWebhook,
} from "@/app/actions/webhooks";
import { AddMemberForm } from "@/components/add-member-form";
import { CreateBoardForm } from "@/components/create-board-form";
import { CreateWebhookForm } from "@/components/create-webhook-form";
import { ConfirmButton } from "@/components/confirm-button";
import { UserMenu } from "@/components/user-menu";
import { eventLabel } from "@/lib/events";

export default async function OrganizationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await requireUser();

  const org = await prisma.organization.findUnique({
    where: { slug },
    include: {
      memberships: {
        include: { user: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!org) notFound();

  const myMembership = org.memberships.find((m) => m.userId === user.id);
  if (!myMembership) notFound(); // não é membro: não revela a organização

  const canManage =
    myMembership.role === "OWNER" || myMembership.role === "ADMIN";
  const canWrite = myMembership.role !== "VIEWER";

  const boards = await prisma.board.findMany({
    where: { organizationId: org.id, archivedAt: null },
    orderBy: { createdAt: "asc" },
  });

  const webhooks = canManage
    ? await prisma.webhook.findMany({
        where: { organizationId: org.id },
        orderBy: { createdAt: "asc" },
      })
    : [];

  const boundAddMember = addMember.bind(null, org.id, org.slug);
  const boundCreateBoard = createBoard.bind(null, org.id, org.slug);
  const boundCreateWebhook = createWebhook.bind(null, org.id);

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-sm text-muted hover:text-brand">
          ← Organizações
        </Link>
        <UserMenu name={user.name ?? ""} email={user.email ?? ""} />
      </div>

      <h1 className="mt-4 text-2xl font-bold">{org.name}</h1>
      <p className="text-sm text-subtle">/{org.slug}</p>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold text-ink">
          Quadros ({boards.length})
        </h2>
        {boards.length === 0 ? (
          <p className="text-sm text-muted">Nenhum quadro ainda.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {boards.map((b) => (
              <li key={b.id}>
                <Link
                  href={`/orgs/${org.slug}/boards/${b.id}`}
                  className="block rounded-xl border border-edge bg-panel px-4 py-3 font-medium transition hover:border-brand"
                >
                  {b.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
        {canWrite && (
          <div className="mt-4">
            <CreateBoardForm action={boundCreateBoard} />
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold text-ink">
          Membros ({org.memberships.length})
        </h2>
        <ul className="divide-y divide-edge overflow-hidden rounded-xl border border-edge">
          {org.memberships.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between bg-panel/60 px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium">{m.user.name}</p>
                <p className="text-xs text-subtle">{m.user.email}</p>
              </div>
              <span className="text-xs uppercase tracking-wide text-muted">
                {m.role}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {canManage && (
        <section className="mt-8 rounded-xl border border-edge bg-panel/60 p-5">
          <h2 className="mb-3 text-sm font-semibold text-ink">
            Adicionar membro
          </h2>
          <AddMemberForm action={boundAddMember} />
        </section>
      )}

      {canManage && (
        <section className="mt-8">
          <h2 className="mb-1 text-sm font-semibold text-ink">
            Webhooks ({webhooks.length})
          </h2>
          <p className="mb-3 text-xs text-muted">
            Notificam uma URL externa a cada evento (card criado/movido,
            comentário, anexo). O payload é assinado em{" "}
            <code className="rounded bg-edge px-1">X-OceanFlow-Signature</code>.
          </p>

          {webhooks.length > 0 && (
            <ul className="mb-4 space-y-2">
              {webhooks.map((w) => (
                <li
                  key={w.id}
                  className="rounded-xl border border-edge bg-panel/60 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {w.url}
                    </span>
                    <span
                      className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                        w.active
                          ? "bg-brand/15 text-brand"
                          : "bg-edge text-muted"
                      }`}
                    >
                      {w.active ? "ativo" : "inativo"}
                    </span>
                    <form action={toggleWebhook.bind(null, w.id)}>
                      <button className="shrink-0 text-xs text-muted hover:text-brand">
                        {w.active ? "desativar" : "ativar"}
                      </button>
                    </form>
                    <ConfirmButton
                      action={deleteWebhook.bind(null, w.id)}
                      triggerClassName="shrink-0 text-xs text-subtle hover:text-red-400"
                      title="Remover webhook?"
                      description="A URL deixará de receber eventos. Esta ação não pode ser desfeita."
                      confirmLabel="Remover"
                    >
                      remover
                    </ConfirmButton>
                  </div>
                  <p className="mt-1 text-[11px] text-muted">
                    eventos:{" "}
                    {w.events.length === 0
                      ? "todos"
                      : w.events.map(eventLabel).join(", ")}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] text-subtle">
                    secret: <code>{w.secret}</code>
                  </p>
                </li>
              ))}
            </ul>
          )}

          <CreateWebhookForm action={boundCreateWebhook} />
        </section>
      )}
    </main>
  );
}
