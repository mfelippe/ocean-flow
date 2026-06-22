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

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
