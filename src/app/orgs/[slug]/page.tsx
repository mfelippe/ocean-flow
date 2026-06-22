import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { addMember } from "@/app/actions/organizations";
import { createBoard } from "@/app/actions/boards";
import { AddMemberForm } from "@/components/add-member-form";
import { CreateBoardForm } from "@/components/create-board-form";
import { UserMenu } from "@/components/user-menu";

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

  const boundAddMember = addMember.bind(null, org.id, org.slug);
  const boundCreateBoard = createBoard.bind(null, org.id, org.slug);

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-sm text-muted hover:text-brand">
          ← Organizações
        </Link>
        <UserMenu name={user.name ?? ""} email={user.email ?? ""} />
      </div>

      <div className="mt-4 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{org.name}</h1>
          <p className="text-sm text-subtle">/{org.slug}</p>
        </div>
        {canManage && (
          <Link
            href={`/orgs/${org.slug}/settings`}
            className="shrink-0 rounded-lg border border-edge px-3 py-1.5 text-sm text-muted hover:bg-edge hover:text-ink"
          >
            Integrações →
          </Link>
        )}
      </div>

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
    </main>
  );
}
