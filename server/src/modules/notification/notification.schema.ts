import { z } from "zod";

export const listNotificationsSchema = z.object({
  unread: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const notificationParamsSchema = z.object({
  id: z.uuid(),
});

export type ListNotificationsInput = z.infer<typeof listNotificationsSchema>;
export type NotificationParams = z.infer<typeof notificationParamsSchema>;
