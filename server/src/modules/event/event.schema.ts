import { z } from "zod";
import { EVENT_CATEGORIES } from "../../entity/Event";
import { RESULT_TYPES } from "../../entity/EventRegistration";

const title = z.string().trim().min(2).max(160);

const slug = z
  .string()
  .trim()
  .toLowerCase()
  .min(2)
  .max(120)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Use lowercase letters, numbers and hyphens",
  );

const description = z.string().trim().max(5000);

const category = z.enum(EVENT_CATEGORIES);

const venue = z.string().trim().min(1).max(160);

const capacity = z.number().int().min(1).max(100000);

const timestamp = z.coerce.date();

const flag = z
  .enum(["true", "false"])
  .transform((value) => value === "true")
  .optional();

export const createEventSchema = z.object({
  clubSlug: z.string().trim().toLowerCase().min(2).max(60),
  title,
  slug,
  category,
  description: description.optional(),
  startsAt: timestamp.optional(),
  endsAt: timestamp.optional(),
  capacity: capacity.optional(),
  venue: venue.optional(),
  bannerUploadId: z.uuid().optional(),
});

export const updateEventSchema = z
  .object({
    title: title.optional(),
    category: category.optional(),
    description: description.nullable().optional(),
    startsAt: timestamp.nullable().optional(),
    endsAt: timestamp.nullable().optional(),
    capacity: capacity.nullable().optional(),
    venue: venue.nullable().optional(),
    organizerUserId: z.uuid().nullable().optional(),
    bannerUploadId: z.uuid().optional(),
  })
  .refine((input) => Object.keys(input).length > 0, {
    message: "Provide at least one field to update",
  });

export const listEventsSchema = z.object({
  search: z.string().trim().min(1).max(160).optional(),
  category: category.optional(),
  club: z.string().trim().toLowerCase().min(2).max(60).optional(),
  from: timestamp.optional(),
  to: timestamp.optional(),
  manage: flag,
  registered: flag,
  status: z.enum(["draft", "published", "cancelled"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const eventStatusSchema = z.object({
  status: z.enum(["published", "cancelled"]),
});

export const registrationParamsSchema = z.object({
  slug: z.string(),
  userId: z.uuid(),
});

export const listRegistrationsSchema = z.object({
  search: z.string().trim().min(1).max(120).optional(),
  status: z.enum(["registered", "checked_in", "cancelled"]).optional(),
  result: z.enum(RESULT_TYPES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const checkInSchema = z.object({
  status: z.literal("checked_in"),
});

export const publishResultsSchema = z
  .object({
    winnerUserId: z.uuid().nullable().optional(),
    runnerUpUserIds: z.array(z.uuid()).max(10).default([]),
  })
  .refine(
    (input) =>
      new Set(input.runnerUpUserIds).size === input.runnerUpUserIds.length,
    { path: ["runnerUpUserIds"], message: "List each student only once" },
  )
  .refine(
    (input) =>
      !input.winnerUserId ||
      !input.runnerUpUserIds.includes(input.winnerUserId),
    {
      path: ["runnerUpUserIds"],
      message: "The winner cannot also be a runner-up",
    },
  );

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type ListEventsInput = z.infer<typeof listEventsSchema>;
export type EventStatusInput = z.infer<typeof eventStatusSchema>;
export type RegistrationParams = z.infer<typeof registrationParamsSchema>;
export type ListRegistrationsInput = z.infer<typeof listRegistrationsSchema>;
export type PublishResultsInput = z.infer<typeof publishResultsSchema>;
