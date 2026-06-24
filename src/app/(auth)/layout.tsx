import { redirect } from "next/navigation";
import { needsSetup } from "@/app/actions/setup";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Instância nova (sem usuários) → manda para o setup de primeiro uso.
  if (await needsSetup()) redirect("/setup");

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-bold text-brand">Ocean Flow</h1>
          <p className="text-sm text-muted">Kanban self-hosted</p>
        </div>
        {children}
      </div>
    </div>
  );
}
