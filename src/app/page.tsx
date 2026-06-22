import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { logout } from "@/app/actions/auth";
import { CreateOrgForm } from "@/components/create-org-form";

export default async function DashboardPage() {
  const user = await requireUser();

  const memberships = await prisma.membership.findMany({
    where: { userId: user.id },
    include: { organization: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Suas organizações</h1>
          <p className="text-sm text-slate-400">
            Olá, {user.name ?? user.email}.
          </p>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
          >
            Sair
          </button>
        </form>
      </header>

      <section className="mt-8 space-y-3">
        {memberships.length === 0 ? (
          <p className="text-sm text-slate-400">
            Você ainda não participa de nenhuma organização. Crie a primeira abaixo.
          </p>
        ) : (
          <ul className="space-y-2">
            {memberships.map((m) => (
              <li key={m.id}>
                <Link
                  href={`/orgs/${m.organization.slug}`}
                  className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-3 transition hover:border-teal-400"
                >
                  <span className="font-medium">{m.organization.name}</span>
                  <span className="text-xs uppercase tracking-wide text-slate-500">
                    {m.role}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8 rounded-xl border border-slate-800 bg-slate-900/30 p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-300">
          Nova organização
        </h2>
        <CreateOrgForm />
      </section>
    </main>
  );
}
