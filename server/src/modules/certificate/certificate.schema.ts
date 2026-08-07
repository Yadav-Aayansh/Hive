import { z } from "zod";

const serial = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^HIVE-\d{4}-[0-9A-HJKMNP-TV-Z]{14}$/, "Not a valid certificate serial");

export const listCertificatesSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const certificateParamsSchema = z.object({
  serial,
});

export type ListCertificatesInput = z.infer<typeof listCertificatesSchema>;
export type CertificateParams = z.infer<typeof certificateParamsSchema>;
