import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { CreateOrgForm } from "@/components/create-org-form";
import { UserMenu } from "@/components/user-menu";

export default async function DashboardPage() {
  const user = await requireUser();

  const [memberships, dbUser] = await Promise.all([
    prisma.membership.findMany({
      where: { userId: user.id },
      include: { organization: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.user.findUnique({
      where: { id: user.id },
      select: { isSuperAdmin: true },
    }),
  ]);

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Suas organizações</h1>
          <p className="text-sm text-muted">
            Olá, {user.name ?? user.email}.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {dbUser?.isSuperAdmin && (
            <Link
              href="/admin"
              className="rounded-lg border border-edge px-3 py-1.5 text-sm text-ink hover:bg-edge"
            >
              Admin
            </Link>
          )}
          <UserMenu name={user.name ?? ""} email={user.email ?? ""} />
        </div>
      </header>

      <section className="mt-8 space-y-3">
        {memberships.length === 0 ? (
          <p className="text-sm text-muted">
            Você ainda não participa de nenhuma organização. Crie a primeira abaixo.
          </p>
        ) : (
          <ul className="space-y-2">
            {memberships.map((m) => (
              <li key={m.id}>
                <Link
                  href={`/orgs/${m.organization.slug}`}
                  className="flex items-center justify-between rounded-xl border border-edge bg-panel px-4 py-3 transition hover:border-brand"
                >
                  <span className="font-medium">{m.organization.name}</span>
                  <span className="text-xs uppercase tracking-wide text-subtle">
                    {m.role}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8 rounded-xl border border-edge bg-panel/60 p-5">
        <h2 className="mb-3 text-sm font-semibold text-ink">
          Nova organização
        </h2>
        <CreateOrgForm />
      </section>
    </main>
  );
}
