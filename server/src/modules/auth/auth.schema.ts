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

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(1).max(128),
  password,
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
