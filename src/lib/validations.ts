import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome."),
  email: z.email("E-mail inválido.").toLowerCase(),
  password: z.string().min(8, "A senha deve ter ao menos 8 caracteres."),
});

export const loginSchema = z.object({
  email: z.email("E-mail inválido.").toLowerCase(),
  password: z.string().min(1, "Informe a senha."),
});

export const createOrgSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da organização."),
});

// Setup de primeiro uso: cria o super admin + a primeira organização.
export const setupSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome."),
  email: z.email("E-mail inválido.").toLowerCase(),
  password: z.string().min(8, "A senha deve ter ao menos 8 caracteres."),
  orgName: z.string().trim().min(2, "Informe o nome da organização."),
});

export const addMemberSchema = z.object({
  email: z.email("E-mail inválido.").toLowerCase(),
  role: z.enum(["ADMIN", "MEMBER", "VIEWER"]),
});

export const boardMemberSchema = z.object({
  email: z.email("E-mail inválido.").toLowerCase(),
  role: z.enum(["ADMIN", "MEMBER", "VIEWER"]),
});

export const boardSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do quadro."),
});

export const columnSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome da coluna."),
});

export const cardSchema = z.object({
  title: z.string().trim().min(1, "Informe o título do card."),
  description: z.string().trim().max(5000).optional().or(z.literal("")),
});

export const labelSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome da label.").max(40),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida (use formato #RRGGBB)."),
});

export const commentSchema = z.object({
  body: z.string().trim().min(1, "Escreva um comentário.").max(5000),
});

export const webhookSchema = z.object({
  url: z.url("Informe uma URL válida (https://…)."),
});

export const apiTokenSchema = z.object({
  name: z.string().trim().min(1, "Dê um nome ao token.").max(60),
});

export const customFieldSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome do campo.").max(40),
  type: z.enum(["TEXT", "NUMBER", "DATE"]),
});

// Atualização parcial de card pela API pública (todos os campos opcionais).
export const apiCardUpdateSchema = z.object({
  title: z.string().trim().min(1, "Título não pode ser vazio.").max(500).optional(),
  description: z.string().max(5000).nullable().optional(),
  dueDate: z.string().nullable().optional(),
  columnId: z.string().min(1).optional(),
  // mapa fieldId → valor (string); "" limpa o campo
  fields: z.record(z.string(), z.string()).optional(),
});

// ─── Automações (gatilho → ações) ────────────────────────────────────
// Cada ação é validada por tipo; o array é guardado como JSON em Automation.actions.
export const automationActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("MOVE_CARD"), columnId: z.string().min(1) }),
  z.object({
    type: z.literal("CREATE_CARD"),
    boardId: z.string().min(1),
    columnId: z.string().min(1),
    title: z.string().trim().min(1, "Informe o título do card a criar.").max(500),
    description: z.string().max(5000).optional(),
  }),
  z.object({ type: z.literal("ADD_LABEL"), labelId: z.string().min(1) }),
  z.object({ type: z.literal("REMOVE_LABEL"), labelId: z.string().min(1) }),
  z.object({
    type: z.literal("ADD_COMMENT"),
    body: z.string().trim().min(1, "Escreva o texto do comentário.").max(5000),
  }),
  z.object({
    type: z.literal("HTTP_REQUEST"),
    method: z.enum(["GET", "POST"]),
    url: z.url("Informe uma URL válida (https://…)."),
    headers: z.record(z.string(), z.string()).optional(),
    body: z.string().max(10000).optional(),
  }),
]);

export const automationSchema = z.object({
  name: z.string().trim().min(1, "Dê um nome à automação.").max(80),
  trigger: z.enum(["CARD_CREATED", "CARD_MOVED_TO_COLUMN"]),
  triggerColumnId: z.string().min(1).nullish(),
  actions: z
    .array(automationActionSchema)
    .min(1, "Adicione ao menos uma ação."),
});

export type AutomationActionInput = z.infer<typeof automationActionSchema>;
export type AutomationInput = z.infer<typeof automationSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Informe a senha atual."),
    newPassword: z.string().min(8, "A nova senha deve ter ao menos 8 caracteres."),
    confirm: z.string(),
  })
  .refine((d) => d.newPassword === d.confirm, {
    message: "A confirmação não confere com a nova senha.",
    path: ["confirm"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
