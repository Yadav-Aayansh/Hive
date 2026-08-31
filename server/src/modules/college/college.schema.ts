import { z } from "zod";

const name = z.string().trim().min(2).max(160);

const description = z.string().trim().max(2000);

export const onboardingSchema = z.object({
  name,

  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2)
    .max(60)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Use lowercase letters, numbers and hyphens",
    ),

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

  description: description.optional(),

  logoUploadId: z.uuid().optional(),
});


export const collegeParamsSchema = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
});

export const updateCollegeSchema = z
  .object({
    name: name.optional(),
    description: description.nullable().optional(),
    logoUploadId: z.uuid().optional(),
  })
  .refine((input) => Object.keys(input).length > 0, {
    message: "Provide at least one field to update",
  });

export const confirmCheckoutSchema = z.object({
  orderId: z.string().trim().min(1).max(64),
  paymentId: z.string().trim().min(1).max(64),
  signature: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-f0-9]{64}$/, "Not a valid payment signature"),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;
export type ConfirmCheckoutInput = z.infer<typeof confirmCheckoutSchema>;
export type CollegeParams = z.infer<typeof collegeParamsSchema>;
export type UpdateCollegeInput = z.infer<typeof updateCollegeSchema>;
