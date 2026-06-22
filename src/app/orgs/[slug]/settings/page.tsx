import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import {
  createWebhook,
  deleteWebhook,
  toggleWebhook,
} from "@/app/actions/webhooks";
import { createApiToken, revokeApiToken } from "@/app/actions/api-tokens";
import { CreateWebhookForm } from "@/components/create-webhook-form";
import { CreateTokenForm } from "@/components/create-token-form";
import { ConfirmButton } from "@/components/confirm-button";
import { UserMenu } from "@/components/user-menu";
import { eventLabel } from "@/lib/events";

export default async function OrgSettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await requireUser();

  const org = await prisma.organization.findUnique({
    where: { slug },
    include: { memberships: { where: { userId: user.id } } },
  });
  if (!org) notFound();

  const membership = org.memberships[0];
  // Integrações são restritas a OWNER/ADMIN.
  if (!membership || (membership.role !== "OWNER" && membership.role !== "ADMIN")) {
    notFound();
  }

  const [webhooks, apiTokens] = await Promise.all([
    prisma.webhook.findMany({
      where: { organizationId: org.id },
      orderBy: { createdAt: "asc" },
    }),
    prisma.apiToken.findMany({
      where: { organizationId: org.id },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const boundCreateWebhook = createWebhook.bind(null, org.id);
  const boundCreateToken = createApiToken.bind(null, org.id);

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <div className="flex items-center justify-between">
        <Link
          href={`/orgs/${slug}`}
          className="text-sm text-muted hover:text-brand"
        >
          ← {org.name}
        </Link>
        <UserMenu name={user.name ?? ""} email={user.email ?? ""} />
      </div>

      <h1 className="mt-4 text-2xl font-bold">Integrações</h1>
      <p className="text-sm text-muted">
        Webhooks e tokens de API da organização {org.name}.
      </p>

      <section className="mt-8">
        <h2 className="mb-1 text-sm font-semibold text-ink">
          Webhooks ({webhooks.length})
        </h2>
        <p className="mb-3 text-xs text-muted">
          Notificam uma URL externa nos eventos selecionados. O payload é
          assinado em{" "}
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
                      w.active ? "bg-brand/15 text-brand" : "bg-edge text-muted"
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

      <section className="mt-8">
        <h2 className="mb-1 text-sm font-semibold text-ink">
          Tokens de API ({apiTokens.length})
        </h2>
        <p className="mb-3 text-xs text-muted">
          Acesso programático à API REST em{" "}
          <code className="rounded bg-edge px-1">/api/v1</code> com o header{" "}
          <code className="rounded bg-edge px-1">
            Authorization: Bearer &lt;token&gt;
          </code>
          .
        </p>

        {apiTokens.length > 0 && (
          <ul className="mb-4 space-y-2">
            {apiTokens.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-edge bg-panel/60 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm">{t.name}</p>
                  <p className="text-[11px] text-subtle">
                    <code>{t.prefix}…</code> ·{" "}
                    {t.lastUsedAt
                      ? `usado em ${t.lastUsedAt.toLocaleDateString("pt-BR")}`
                      : "nunca usado"}
                  </p>
                </div>
                <ConfirmButton
                  action={revokeApiToken.bind(null, t.id)}
                  triggerClassName="shrink-0 text-xs text-subtle hover:text-red-400"
                  title="Revogar token?"
                  description="Aplicações que usam este token perderão o acesso imediatamente."
                  confirmLabel="Revogar"
                >
                  revogar
                </ConfirmButton>
              </li>
            ))}
          </ul>
        )}

        <CreateTokenForm action={boundCreateToken} />
      </section>
    </main>
  );
}
