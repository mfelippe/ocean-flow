import { redirect } from "next/navigation";
import { auth } from "@/auth";

/**
 * Garante um usuário autenticado em Server Components / Server Actions.
 * Redireciona para /login quando não há sessão. Retorna o usuário (com id).
 */
export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  return session.user;
}
