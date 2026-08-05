import { z } from "zod";

const title = z.string().trim().min(2).max(160);

const body = z.string().trim().min(1).max(5000);

export const createAnnouncementSchema = z.object({
  clubSlug: z.string().trim().toLowerCase().min(2).max(60),
  title,
  body,
});

export const updateAnnouncementSchema = z
  .object({
    title: title.optional(),
    body: body.optional(),
  })
  .refine((input) => Object.keys(input).length > 0, {
    message: "Provide at least one field to update",
  });

export const listAnnouncementsSchema = z.object({
  search: z.string().trim().min(1).max(160).optional(),
  club: z.string().trim().toLowerCase().min(2).max(60).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const announcementParamsSchema = z.object({
  id: z.uuid(),
});

export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;
export type UpdateAnnouncementInput = z.infer<typeof updateAnnouncementSchema>;
export type ListAnnouncementsInput = z.infer<typeof listAnnouncementsSchema>;
export type AnnouncementParams = z.infer<typeof announcementParamsSchema>;
