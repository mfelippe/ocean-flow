// Validação de ambiente executada no start do container, ANTES de migrar.
// Falha rápido com mensagem clara se a configuração estiver incorreta.

const errors = [];

const url = process.env.DATABASE_URL || "";
if (!/^postgres(ql)?:\/\//i.test(url)) {
  const shown = url
    ? url.replace(/(\/\/[^:/]+:)[^@/]*@/, "$1****@") // mascara a senha
    : "(vazia)";
  errors.push(
    `DATABASE_URL precisa ser uma URL PostgreSQL (postgresql://...). ` +
      `Valor recebido: ${shown}`,
  );
}

if (!process.env.AUTH_SECRET) {
  errors.push("AUTH_SECRET é obrigatório (gere com: openssl rand -base64 32).");
}

if (errors.length > 0) {
  console.error(
    "\n[ocean-flow] Configuração inválida:\n" +
      errors.map((e) => "  - " + e).join("\n") +
      "\n",
  );
  process.exit(1);
}

console.log("[ocean-flow] Ambiente OK — PostgreSQL detectado.");
