import { z } from "zod";

export const UPLOAD_PURPOSES = [
  "avatar",
  "college_logo",
  "club_logo",
  "event_banner",
] as const;

export const uploadSchema = z.object({
  purpose: z.enum(UPLOAD_PURPOSES),
});

export type UploadPurpose = (typeof UPLOAD_PURPOSES)[number];
export type UploadInput = z.infer<typeof uploadSchema>;
