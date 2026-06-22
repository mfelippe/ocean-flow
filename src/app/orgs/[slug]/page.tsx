import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { addMember } from "@/app/actions/organizations";
import { AddMemberForm } from "@/components/add-member-form";

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

  const boundAddMember = addMember.bind(null, org.id, org.slug);

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link href="/" className="text-sm text-slate-400 hover:text-teal-400">
        ← Organizações
      </Link>

      <h1 className="mt-4 text-2xl font-bold">{org.name}</h1>
      <p className="text-sm text-slate-500">/{org.slug}</p>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold text-slate-300">
          Membros ({org.memberships.length})
        </h2>
        <ul className="divide-y divide-slate-800 overflow-hidden rounded-xl border border-slate-800">
          {org.memberships.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between bg-slate-900/30 px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium">{m.user.name}</p>
                <p className="text-xs text-slate-500">{m.user.email}</p>
              </div>
              <span className="text-xs uppercase tracking-wide text-slate-400">
                {m.role}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {canManage && (
        <section className="mt-8 rounded-xl border border-slate-800 bg-slate-900/30 p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-300">
            Adicionar membro
          </h2>
          <AddMemberForm action={boundAddMember} />
        </section>
      )}
    </main>
  );
}
