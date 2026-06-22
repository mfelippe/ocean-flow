import { PrismaClient } from "@prisma/client";

// Em desenvolvimento o hot-reload do Next recria módulos a cada alteração.
// Reaproveitar o client via globalThis evita esgotar o pool de conexões.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
