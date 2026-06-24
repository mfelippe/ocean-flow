import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * Garante um usuário autenticado em Server Components / Server Actions.
 * Redireciona para /login quando não há sessão. Também barra usuários
 * bloqueados ou removidos (uma sessão JWT antiga deixa de valer na hora).
 * Retorna o usuário (com id).
 */
export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, blockedAt: true },
  });
  if (!dbUser || dbUser.blockedAt) {
    redirect("/login?blocked=1");
  }

  return session.user;
}
