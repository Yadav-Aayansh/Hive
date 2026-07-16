import { z } from "zod";

export const onboardingSchema = z.object({
  name: z.string().trim().min(2).max(160),

  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens"),

  domain: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(190)
    .regex(
      /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/,
      "Enter a bare domain, e.g. iitm.ac.in",
    ),

  description: z.string().trim().max(2000).optional(),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;
