import { redirect } from "next/navigation";
import { needsSetup } from "@/app/actions/setup";
import { SetupForm } from "@/components/setup-form";

// Consulta o banco (needsSetup) e reflete estado ao vivo — nunca pré-renderizar
// no build (senão falha sem DATABASE_URL).
export const dynamic = "force-dynamic";

// Tela de primeiro uso (estilo Uptime Kuma): cria o admin da instância e a
// primeira organização. Se a instância já tem usuários, sai para o login.
export default async function SetupPage() {
  if (!(await needsSetup())) redirect("/login");

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-bold text-brand">Ocean Flow</h1>
          <p className="text-sm text-muted">
            Bem-vindo! Crie a conta de administrador para começar.
          </p>
        </div>
        <SetupForm />
      </div>
    </div>
  );
}
