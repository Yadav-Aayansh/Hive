import { z } from "zod";
import { CLUB_CATEGORIES } from "../../entity/Club";

const name = z.string().trim().min(2).max(120);

const description = z.string().trim().max(2000);

const category = z.enum(CLUB_CATEGORIES);

const type = z.enum(["official", "unofficial"]);

const decision = z.enum(["approved", "rejected"]);

const flag = z
  .enum(["true", "false"])
  .transform((value) => value === "true")
  .optional();

export const createClubSchema = z.object({
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

  category,

  type,

  description: description.optional(),

  logoUploadId: z.uuid().optional(),
});

export const updateClubSchema = z
  .object({
    name: name.optional(),
    category: category.optional(),
    description: description.nullable().optional(),
    logoUploadId: z.uuid().optional(),
  })
  .refine((input) => Object.keys(input).length > 0, {
    message: "Provide at least one field to update",
  });

export const listClubsSchema = z.object({
  search: z.string().trim().min(1).max(120).optional(),
  category: category.optional(),
  type: type.optional(),
  status: z.enum(["pending", "approved", "rejected"]).optional(),
  mine: flag,
  sort: z.enum(["name", "newest"]).default("name"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const decideClubSchema = z.object({ status: decision });

export const decideMembershipSchema = z.object({ status: decision });

export const transferLeaderSchema = z.object({ userId: z.uuid() });

export const memberParamsSchema = z.object({
  slug: z.string(),
  userId: z.uuid(),
});

export type CreateClubInput = z.infer<typeof createClubSchema>;
export type UpdateClubInput = z.infer<typeof updateClubSchema>;
export type ListClubsInput = z.infer<typeof listClubsSchema>;
export type DecideClubInput = z.infer<typeof decideClubSchema>;
export type DecideMembershipInput = z.infer<typeof decideMembershipSchema>;
export type TransferLeaderInput = z.infer<typeof transferLeaderSchema>;
