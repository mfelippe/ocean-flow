import { prisma } from "@/lib/prisma";

// Health-check do banco: confirma que o app conversa com o Postgres.
async function checkDatabase(): Promise<{ ok: boolean; detail: string }> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true, detail: "conectado" };
  } catch (error) {
    return {
      ok: false,
      detail: error instanceof Error ? error.message : "erro desconhecido",
    };
  }
}

export default async function Home() {
  const db = await checkDatabase();

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-8 px-6 py-16">
      <div className="space-y-3">
        <span className="text-sm font-medium uppercase tracking-widest text-teal-400">
          🚧 Fase 0 — Esqueleto
        </span>
        <h1 className="text-4xl font-bold">Ocean Flow</h1>
        <p className="text-slate-400">
          Plataforma open source de Kanban e fluxos de trabalho — self-hosted.
        </p>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-5">
        <div className="flex items-center gap-3">
          <span
            className={`inline-block h-3 w-3 rounded-full ${
              db.ok ? "bg-teal-400" : "bg-red-500"
            }`}
            aria-hidden
          />
          <span className="font-medium">
            Banco de dados: {db.ok ? "conectado" : "indisponível"}
          </span>
        </div>
        {!db.ok && (
          <p className="mt-2 text-sm text-red-400">{db.detail}</p>
        )}
      </div>
    </main>
  );
}
