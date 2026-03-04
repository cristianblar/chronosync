import { z } from "zod";

export const emailSchema = z.string().email("Email no válido");
export const passwordSchema = z
  .string()
  .min(8, "Mínimo 8 caracteres")
  .regex(/[A-Z]/, "Debe incluir una mayúscula")
  .regex(/[0-9]/, "Debe incluir un número");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Requerido"),
});

export const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: emailSchema,
  password: passwordSchema,
  timezone: z.string().optional(),
});

export const obligationSchema = z.object({
  name: z.string().min(2),
  type: z.enum(["work", "class", "family", "health", "other"]),
  start_time: z.string().min(5),
  end_time: z.string().min(5),
  days_of_week: z.array(z.number().min(0).max(6)).min(1),
  is_recurring: z.boolean(),
  valid_from: z.string(),
  valid_until: z.string().optional().nullable(),
});

export const eventSchema = z.object({
  name: z.string().min(2),
  type: z.enum(["exam", "presentation", "interview", "travel", "other"]),
  event_date: z.string(),
  event_time: z.string().optional().nullable(),
  importance: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  notes: z.string().optional().nullable(),
});
