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


export const updateCollegeSchema = z
  .object({
    name: name.optional(),
    description: description.nullable().optional(),
    logoUploadId: z.uuid().optional(),
  })
  .refine((input) => Object.keys(input).length > 0, {
    message: "Provide at least one field to update",
  });

export type OnboardingInput = z.infer<typeof onboardingSchema>;
export type UpdateCollegeInput = z.infer<typeof updateCollegeSchema>;
