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
import {
  createAutomation,
  deleteAutomation,
  toggleAutomation,
} from "@/app/actions/automations";
import { AddBoardMemberForm } from "@/components/add-board-member-form";
import { CreateCustomFieldForm } from "@/components/create-custom-field-form";
import { AutomationForm } from "@/components/automation-form";
import {
  BoardMembersTable,
  CustomFieldsTable,
  AutomationsTable,
} from "@/components/settings-tables";
import { UserMenu } from "@/components/user-menu";

const FIELD_TYPE_LABEL: Record<string, string> = {
  TEXT: "Texto",
  NUMBER: "Número",
  DATE: "Data",
};

const ACTION_LABEL: Record<string, string> = {
  MOVE_CARD: "mover para coluna",
  CREATE_CARD: "criar card em outro quadro",
  ADD_LABEL: "adicionar label",
  REMOVE_LABEL: "remover label",
  ADD_COMMENT: "comentar",
  HTTP_REQUEST: "requisição HTTP",
};

function describeActions(actions: unknown): string {
  if (!Array.isArray(actions)) return "—";
  return actions
    .map((a) => ACTION_LABEL[(a as { type?: string })?.type ?? ""] ?? "ação")
    .join(", ");
}

export default async function BoardAccessPage({
  params,
}: {
  params: Promise<{ slug: string; boardId: string }>;
}) {
  const { slug, boardId } = await params;

  // Apenas administradores do quadro (lança/404 caso contrário).
  const { user, board, orgRole } = await requireBoardManage(boardId);
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

  const columns = await prisma.column.findMany({
    where: { boardId },
    orderBy: { rank: "asc" },
    select: { id: true, name: true },
  });

  const labels = await prisma.label.findMany({
    where: { boardId },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const automations = await prisma.automation.findMany({
    where: { boardId },
    orderBy: { createdAt: "asc" },
    include: { triggerColumn: { select: { name: true } } },
  });

  // Quadros da MESMA org que o usuário pode escolher como destino de "criar card".
  // Org admins veem todos; demais veem os ORG-visíveis + aqueles em que são membros.
  const isOrgAdmin = orgRole === "OWNER" || orgRole === "ADMIN";
  const memberBoardIds = isOrgAdmin
    ? new Set<string>()
    : new Set(
        (
          await prisma.boardMembership.findMany({
            where: { userId: user.id, board: { organizationId: board.organizationId } },
            select: { boardId: true },
          })
        ).map((m) => m.boardId),
      );
  const orgBoards = (
    await prisma.board.findMany({
      where: { organizationId: board.organizationId, archivedAt: null },
      orderBy: { name: "asc" },
      include: {
        columns: { orderBy: { rank: "asc" }, select: { id: true, name: true } },
      },
    })
  )
    .filter(
      (b) => isOrgAdmin || b.visibility === "ORG" || memberBoardIds.has(b.id),
    )
    .map((b) => ({ id: b.id, name: b.name, columns: b.columns }));

  const isPrivate = board.visibility === "PRIVATE";
  const boundAddMember = addBoardMember.bind(null, boardId);
  const boundCreateField = createCustomField.bind(null, boardId);
  const boundCreateAutomation = createAutomation.bind(null, boardId);

  const memberRows = members.map((m) => ({
    id: m.id,
    name: m.user.name,
    email: m.user.email,
    role: m.role,
  }));
  const fieldRows = customFields.map((f) => ({
    id: f.id,
    name: f.name,
    typeLabel: FIELD_TYPE_LABEL[f.type] ?? f.type,
  }));
  const automationRows = automations.map((a) => ({
    id: a.id,
    name: a.name,
    enabled: a.enabled,
    triggerText:
      a.trigger === "CARD_CREATED"
        ? `Card criado${a.triggerColumn ? ` em "${a.triggerColumn.name}"` : ""}`
        : `Card movido para "${a.triggerColumn?.name ?? "?"}"`,
    actionsText: describeActions(a.actions),
  }));

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

      <h1 className="mt-4 text-2xl font-bold">⚙️ Configurações do quadro</h1>
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
          <div className="mb-4">
            <BoardMembersTable members={memberRows} onRemove={removeBoardMember} />
          </div>
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
          <div className="mb-4">
            <CustomFieldsTable fields={fieldRows} onDelete={deleteCustomField} />
          </div>
        )}

        <CreateCustomFieldForm action={boundCreateField} />
      </section>

      <section className="mt-8">
        <h2 className="mb-1 text-sm font-semibold text-ink">
          Automações ({automations.length})
        </h2>
        <p className="mb-3 text-xs text-muted">
          Regras gatilho → ação executadas neste quadro. Úteis para esteiras
          automáticas e integrações (ex.: avisar a BotConversa via requisição
          HTTP quando um card entra numa coluna).
        </p>

        {automations.length > 0 && (
          <div className="mb-4">
            <AutomationsTable
              automations={automationRows}
              onToggle={toggleAutomation}
              onDelete={deleteAutomation}
            />
          </div>
        )}

        {columns.length === 0 ? (
          <p className="rounded-lg border border-edge bg-panel/60 px-4 py-3 text-xs text-muted">
            Crie ao menos uma coluna no quadro para configurar automações.
          </p>
        ) : (
          <AutomationForm
            action={boundCreateAutomation}
            columns={columns}
            labels={labels}
            boards={orgBoards}
          />
        )}
      </section>
    </main>
  );
}
