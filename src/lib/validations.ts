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

export const addMemberSchema = z.object({
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

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
