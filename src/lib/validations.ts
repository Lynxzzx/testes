import { z } from "zod";

export const companySchema = z.object({
  name: z.string().trim().max(160).default(""),
  cnpj: z.string().trim().max(32).default(""),
  email: z.string().trim().max(160).default(""),
  phone: z.string().trim().max(40).default(""),
  website: z.string().trim().max(200).default(""),
  address: z.string().trim().max(300).default(""),
  responsible: z.string().trim().max(120).default(""),
  about: z.string().trim().max(2000).default(""),
  differentials: z.string().trim().max(2000).default(""),
});

export const toneSchema = z.enum(["formal", "consultivo", "direto"]);

export const sectionSchema = z.enum([
  "resumo",
  "contexto",
  "escopo",
  "metodologia",
  "cronograma",
  "investimento",
  "diferenciais",
  "termos",
  "proximos",
]);

export const generateSchema = z.object({
  title: z.string().trim().min(3, "Dê um nome à proposta").max(160),
  clientName: z.string().trim().max(160).optional().default(""),
  brief: z
    .string()
    .trim()
    .min(40, "O brief precisa ter ao menos 40 caracteres")
    .max(15000, "O brief pode ter no máximo 15.000 caracteres"),
  tone: toneSchema,
  sections: z.array(sectionSchema).min(1, "Selecione ao menos uma seção"),
  company: companySchema,
  saveAsDefault: z.boolean().optional().default(false),
});

export const updateProposalSchema = z.object({
  title: z.string().trim().min(3).max(160).optional(),
  clientName: z.string().trim().max(160).optional(),
  content: z.string().max(100_000).optional(),
  status: z.enum(["draft", "final"]).optional(),
});

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome").max(100),
  email: z.string().trim().toLowerCase().email("Email inválido"),
  password: z.string().min(8, "A senha precisa ter ao menos 8 caracteres").max(100),
});

export const updateUserSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  company: companySchema.partial().optional(),
  logo: z
    .string()
    .max(450_000, "Logo muito grande (máx. ~300KB)")
    .refine((v) => v === "" || /^data:image\/(png|jpe?g);base64,/.test(v), "Formato de logo inválido (use PNG ou JPG)")
    .optional(),
  tone: toneSchema.optional(),
  onboarded: z.boolean().optional(),
});
