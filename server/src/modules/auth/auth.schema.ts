import { z } from "zod";

const password = z.string().min(8, "Must be at least 8 characters").max(72);

const email = z.string().trim().toLowerCase().pipe(z.email("Not a valid email"));

const fullName = z.string().trim().min(2).max(120);

export const signupSchema = z.discriminatedUnion("role", [
  z.object({
    role: z.literal("campus_admin"),
    email,
    password,
    fullName,
  }),
  z.object({
    role: z.literal("student"),
    email,
    password,
    fullName,
  }),
]);

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Required"),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
