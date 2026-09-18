// Reset de senha do administrador da instância (uso operacional, no servidor).
//
// Roda no container da app, onde DATABASE_URL já aponta para o banco:
//
//   docker compose exec app node scripts/reset-admin.mjs
//
// Fluxo interativo:
//   - lista os super admins existentes (para você lembrar qual e-mail usar);
//   - pergunta o e-mail;
//   - se o usuário existir: define uma nova senha, desbloqueia (blockedAt) e
//     garante isSuperAdmin — sem apagar dados nem criar org órfã;
//   - se não existir: oferece criar um novo super admin.
//
// Não expõe nenhuma rota web e não mexe em variáveis de ambiente: quem executa
// já precisa de acesso ao servidor. A senha é digitada oculta (não vaza no
// histórico do shell nem em `ps`).

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import readline from "node:readline";

const prisma = new PrismaClient();
const BCRYPT_COST = 10; // mesmo custo do app (src/app/actions/setup.ts)
const MIN_PASSWORD = 8; // mesmo mínimo do setupSchema

/** Sai com mensagem de erro e código 1. */
function fail(message) {
  console.error(`\n✖ ${message}`);
  process.exit(1);
}

/** Pergunta visível (eco normal). */
function ask(query) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) =>
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer.trim());
    }),
  );
}

/** Pergunta com entrada oculta (mascara com '*'). Requer TTY. */
function askHidden(query) {
  if (!process.stdin.isTTY) {
    fail(
      "Entrada de senha oculta exige um terminal (TTY).\n" +
        "Rode com um terminal interativo, ex.: docker compose exec app node scripts/reset-admin.mjs",
    );
  }
  return new Promise((resolve) => {
    const input = process.stdin;
    const output = process.stdout;
    output.write(query);
    input.setRawMode(true);
    input.resume();
    input.setEncoding("utf8");
    let value = "";
    const onData = (chunk) => {
      for (const char of chunk) {
        if (char === "\n" || char === "\r" || char === "") {
          input.setRawMode(false);
          input.pause();
          input.removeListener("data", onData);
          output.write("\n");
          resolve(value);
          return;
        }
        if (char === "") {
          // Ctrl-C
          output.write("\n");
          process.exit(1);
        }
        if (char === "" || char === "\b") {
          if (value.length > 0) {
            value = value.slice(0, -1);
            output.write("\b \b");
          }
          continue;
        }
        value += char;
        output.write("*");
      }
    };
    input.on("data", onData);
  });
}

/** Pede uma senha nova, com confirmação e validação de tamanho mínimo. */
async function promptNewPassword() {
  for (;;) {
    const pw = await askHidden("Nova senha: ");
    if (pw.length < MIN_PASSWORD) {
      console.log(`  A senha deve ter ao menos ${MIN_PASSWORD} caracteres. Tente de novo.`);
      continue;
    }
    const confirm = await askHidden("Confirme a senha: ");
    if (pw !== confirm) {
      console.log("  As senhas não conferem. Tente de novo.");
      continue;
    }
    return pw;
  }
}

async function main() {
  console.log("── Ocean Flow · reset de admin ──\n");

  const admins = await prisma.user.findMany({
    where: { isSuperAdmin: true },
    select: { email: true, name: true, blockedAt: true },
    orderBy: { createdAt: "asc" },
  });
  if (admins.length > 0) {
    console.log("Super admins atuais:");
    for (const a of admins) {
      console.log(`  • ${a.email} (${a.name})${a.blockedAt ? " [bloqueado]" : ""}`);
    }
    console.log("");
  } else {
    console.log("Nenhum super admin cadastrado ainda.\n");
  }

  const email = (await ask("E-mail do admin: ")).toLowerCase();
  if (!email || !email.includes("@")) fail("E-mail inválido.");

  const user = await prisma.user.findUnique({ where: { email } });

  if (user) {
    const password = await promptNewPassword();
    const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, blockedAt: null, isSuperAdmin: true },
    });
    console.log(`\n✔ Senha de ${email} redefinida. Usuário desbloqueado e com super admin garantido.`);
    console.log("  Faça login em /login com a nova senha.");
    return;
  }

  // Usuário não existe: oferecer criar um novo super admin.
  console.log(`\nNenhum usuário com o e-mail "${email}".`);
  const create = (await ask("Criar um novo super admin com esse e-mail? (s/N): ")).toLowerCase();
  if (create !== "s" && create !== "sim") {
    console.log("Nada foi alterado.");
    return;
  }

  const name = await ask("Nome do admin: ");
  if (name.length < 2) fail("Informe um nome com ao menos 2 caracteres.");
  const password = await promptNewPassword();
  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);

  // Vincula o novo admin a uma organização como OWNER, quando houver.
  const orgs = await prisma.organization.findMany({
    select: { id: true, name: true, slug: true },
    orderBy: { createdAt: "asc" },
  });

  let membership;
  if (orgs.length === 1) {
    membership = { create: { role: "OWNER", organizationId: orgs[0].id } };
    console.log(`\nVinculando à organização "${orgs[0].name}" como OWNER.`);
  } else if (orgs.length > 1) {
    console.log("\nOrganizações:");
    orgs.forEach((o, i) => console.log(`  ${i + 1}) ${o.name} (${o.slug})`));
    const pick = await ask(`Vincular a qual? (1-${orgs.length}, ou Enter para nenhuma): `);
    const idx = Number.parseInt(pick, 10) - 1;
    if (Number.isInteger(idx) && orgs[idx]) {
      membership = { create: { role: "OWNER", organizationId: orgs[idx].id } };
    }
  }

  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      isSuperAdmin: true,
      ...(membership ? { memberships: membership } : {}),
    },
  });
  console.log(`\n✔ Super admin ${email} criado.${membership ? "" : " (Sem organização vinculada.)"}`);
  console.log("  Faça login em /login com a nova senha.");
}

main()
  .catch((e) => fail(e instanceof Error ? e.message : String(e)))
  .finally(() => prisma.$disconnect());
