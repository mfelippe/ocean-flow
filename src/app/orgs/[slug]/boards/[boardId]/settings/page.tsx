import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireBoardManage } from "@/lib/authz";
import {
  addBoardMember,
  removeBoardMember,
  setBoardVisibility,
} from "@/app/actions/board-access";
import {
  createCustomField,
  deleteCustomField,
} from "@/app/actions/custom-fields";
import { AddBoardMemberForm } from "@/components/add-board-member-form";
import { CreateCustomFieldForm } from "@/components/create-custom-field-form";
import { ConfirmButton } from "@/components/confirm-button";
import { UserMenu } from "@/components/user-menu";

const FIELD_TYPE_LABEL: Record<string, string> = {
  TEXT: "Texto",
  NUMBER: "Número",
  DATE: "Data",
};

export default async function BoardAccessPage({
  params,
}: {
  params: Promise<{ slug: string; boardId: string }>;
}) {
  const { slug, boardId } = await params;

  // Apenas administradores do quadro (lança/404 caso contrário).
  const { user, board } = await requireBoardManage(boardId);
  if (board.organization.slug !== slug || board.archivedAt) notFound();

  const members = await prisma.boardMembership.findMany({
    where: { boardId },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });

  const customFields = await prisma.customField.findMany({
    where: { boardId },
    orderBy: { createdAt: "asc" },
  });

  const isPrivate = board.visibility === "PRIVATE";
  const boundAddMember = addBoardMember.bind(null, boardId);
  const boundCreateField = createCustomField.bind(null, boardId);

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <div className="flex items-center justify-between">
        <Link
          href={`/orgs/${slug}/boards/${boardId}`}
          className="text-sm text-muted hover:text-brand"
        >
          ← {board.name}
        </Link>
        <UserMenu name={user.name ?? ""} email={user.email ?? ""} />
      </div>

      <h1 className="mt-4 text-2xl font-bold">Acesso ao quadro</h1>
      <p className="text-sm text-muted">{board.name}</p>

      <section className="mt-8">
        <h2 className="mb-2 text-sm font-semibold text-ink">Visibilidade</h2>
        <div className="flex items-center justify-between rounded-xl border border-edge bg-panel/60 p-4">
          <div>
            <p className="text-sm font-medium">
              {isPrivate ? "Privado" : "Toda a organização"}
            </p>
            <p className="text-xs text-muted">
              {isPrivate
                ? "Apenas admins da org e membros do quadro têm acesso."
                : "Todos os membros da organização acessam (pelo papel da org)."}
            </p>
          </div>
          <form
            action={setBoardVisibility.bind(
              null,
              boardId,
              isPrivate ? "ORG" : "PRIVATE",
            )}
          >
            <button className="rounded-lg border border-edge px-3 py-1.5 text-sm text-ink hover:bg-edge">
              {isPrivate ? "Tornar da organização" : "Tornar privado"}
            </button>
          </form>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-1 text-sm font-semibold text-ink">
          Membros do quadro ({members.length})
        </h2>
        <p className="mb-3 text-xs text-muted">
          Define o papel da pessoa neste quadro (sobrepõe o papel da
          organização). Necessário para quadros privados.
        </p>

        {members.length > 0 && (
          <ul className="mb-4 divide-y divide-edge overflow-hidden rounded-xl border border-edge">
            {members.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between bg-panel/60 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium">{m.user.name}</p>
                  <p className="text-xs text-subtle">{m.user.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs uppercase tracking-wide text-muted">
                    {m.role}
                  </span>
                  <ConfirmButton
                    action={removeBoardMember.bind(null, m.id)}
                    triggerClassName="text-xs text-subtle hover:text-red-400"
                    title="Remover do quadro?"
                    description={`${m.user.name} perderá o acesso específico a este quadro.`}
                    confirmLabel="Remover"
                  >
                    remover
                  </ConfirmButton>
                </div>
              </li>
            ))}
          </ul>
        )}

        <AddBoardMemberForm action={boundAddMember} />
      </section>

      <section className="mt-8">
        <h2 className="mb-1 text-sm font-semibold text-ink">
          Campos personalizados ({customFields.length})
        </h2>
        <p className="mb-3 text-xs text-muted">
          Campos extras preenchidos em cada card (ex.: Telefone, CPF). Aparecem
          no card e na API — úteis para integrações.
        </p>

        {customFields.length > 0 && (
          <ul className="mb-4 divide-y divide-edge overflow-hidden rounded-xl border border-edge">
            {customFields.map((f) => (
              <li
                key={f.id}
                className="flex items-center justify-between bg-panel/60 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium">{f.name}</p>
                  <p className="text-xs text-subtle">
                    {FIELD_TYPE_LABEL[f.type] ?? f.type}
                  </p>
                </div>
                <ConfirmButton
                  action={deleteCustomField.bind(null, f.id)}
                  triggerClassName="text-xs text-subtle hover:text-red-400"
                  title="Excluir campo?"
                  description={`O campo "${f.name}" e seus valores em todos os cards serão removidos.`}
                  confirmLabel="Excluir"
                >
                  excluir
                </ConfirmButton>
              </li>
            ))}
          </ul>
        )}

        <CreateCustomFieldForm action={boundCreateField} />
      </section>
    </main>
  );
}
