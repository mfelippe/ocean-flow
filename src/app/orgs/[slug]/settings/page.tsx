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
import { WebhooksTable, TokensTable } from "@/components/settings-tables";
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

  const webhookRows = webhooks.map((w) => ({
    id: w.id,
    url: w.url,
    active: w.active,
    eventsText: w.events.length === 0 ? "todos" : w.events.map(eventLabel).join(", "),
    secret: w.secret,
  }));
  const tokenRows = apiTokens.map((t) => ({
    id: t.id,
    name: t.name,
    prefix: t.prefix,
    lastUsedText: t.lastUsedAt
      ? `usado em ${t.lastUsedAt.toLocaleDateString("pt-BR")}`
      : "nunca usado",
  }));

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
          <div className="mb-4">
            <WebhooksTable
              webhooks={webhookRows}
              onToggle={toggleWebhook}
              onDelete={deleteWebhook}
            />
          </div>
        )}

        <CreateWebhookForm action={boundCreateWebhook} />
      </section>

      <section className="mt-8">
        <h2 className="mb-1 text-sm font-semibold text-ink">
          Tokens de API ({apiTokens.length})
        </h2>
        <p className="mb-1 text-xs text-muted">
          Acesso programático à API REST em{" "}
          <code className="rounded bg-edge px-1">/api/v1</code> com o header{" "}
          <code className="rounded bg-edge px-1">
            Authorization: Bearer &lt;token&gt;
          </code>
          .
        </p>
        <p className="mb-1 text-xs text-muted">
          O mesmo token conecta agentes de IA via{" "}
          <strong>servidor MCP</strong> em{" "}
          <code className="rounded bg-edge px-1">/api/mcp</code> (ferramentas:
          listar quadros, criar/mover card, comentar).
        </p>
        <p className="mb-3 text-xs text-muted">
          📖 Documentação:{" "}
          <a
            href="/api-docs"
            target="_blank"
            rel="noreferrer"
            className="text-brand hover:underline"
          >
            API REST (interativa) →
          </a>{" "}
          ·{" "}
          <a
            href="/mcp-docs"
            target="_blank"
            rel="noreferrer"
            className="text-brand hover:underline"
          >
            servidor MCP →
          </a>
        </p>

        {apiTokens.length > 0 && (
          <div className="mb-4">
            <TokensTable tokens={tokenRows} onRevoke={revokeApiToken} />
          </div>
        )}

        <CreateTokenForm action={boundCreateToken} />
      </section>
    </main>
  );
}
