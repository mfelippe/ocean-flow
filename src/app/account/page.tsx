import Link from "next/link";
import { requireUser } from "@/lib/session";
import { Avatar } from "@/components/avatar";
import { ChangePasswordForm } from "@/components/change-password-form";

export default async function AccountPage() {
  const user = await requireUser();

  return (
    <main className="mx-auto max-w-md px-6 py-12">
      <Link href="/" className="text-sm text-muted hover:text-brand">
        ← Voltar
      </Link>

      <div className="mt-6 flex items-center gap-3">
        <Avatar name={user.name ?? user.email ?? "?"} size={48} />
        <div>
          <h1 className="text-xl font-bold">{user.name}</h1>
          <p className="text-sm text-muted">{user.email}</p>
        </div>
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold text-ink">Trocar senha</h2>
        <ChangePasswordForm />
      </section>
    </main>
  );
}
