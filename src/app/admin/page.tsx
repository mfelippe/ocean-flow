import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/authz";
import { AdminUsersTable } from "@/components/admin-users-table";
import { UserMenu } from "@/components/user-menu";

export const metadata = { title: "Ocean Flow — Admin" };

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-edge bg-panel/60 p-4">
      <p className="text-2xl font-bold text-ink">{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}

export default async function AdminPage() {
  const admin = await requireSuperAdmin();

  const [users, orgCount, boardCount, cardCount] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        isSuperAdmin: true,
        blockedAt: true,
        createdAt: true,
      },
    }),
    prisma.organization.count(),
    prisma.board.count({ where: { archivedAt: null } }),
    prisma.card.count({ where: { archivedAt: null } }),
  ]);

  const blockedCount = users.filter((u) => u.blockedAt).length;

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-sm text-muted hover:text-brand">
          ← Ocean Flow
        </Link>
        <UserMenu name={admin.name ?? ""} email={admin.email ?? ""} />
      </div>

      <h1 className="mt-4 text-2xl font-bold">Administração da instância</h1>
      <p className="text-sm text-muted">
        Visão geral e gestão de usuários de toda a instância.
      </p>

      <section className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Usuários" value={users.length} />
        <StatCard label="Organizações" value={orgCount} />
        <StatCard label="Quadros" value={boardCount} />
        <StatCard label="Cards" value={cardCount} />
      </section>

      <section className="mt-8">
        <h2 className="mb-1 text-sm font-semibold text-ink">
          Usuários ({users.length})
          {blockedCount > 0 && (
            <span className="ml-2 text-xs font-normal text-muted">
              · {blockedCount} bloqueado(s)
            </span>
          )}
        </h2>
        <p className="mb-3 text-xs text-muted">
          Resetar a senha gera uma temporária (mostrada uma vez). Bloquear
          impede o login imediatamente.
        </p>

        <AdminUsersTable users={users} adminId={admin.id} />
      </section>
    </main>
  );
}
