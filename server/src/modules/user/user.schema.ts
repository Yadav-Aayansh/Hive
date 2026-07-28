import { z } from "zod";

export const updateProfileSchema = z
  .object({
    fullName: z.string().trim().min(2).max(120).optional(),
    avatarUploadId: z.uuid().optional(),
    rollNo: z.string().trim().min(1).max(40).nullable().optional(),
    branch: z.string().trim().min(1).max(100).nullable().optional(),
    bio: z.string().trim().max(1000).nullable().optional(),
  })
  .refine((input) => Object.keys(input).length > 0, {
    message: "Provide at least one field to update",
  });

export const userIdParamSchema = z.object({ id: z.uuid() });

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
