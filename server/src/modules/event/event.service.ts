import crypto from "node:crypto";
import { In } from "typeorm";
import { AppDataSource } from "../../config/data-source";
import { Club } from "../../entity/Club";
import {
  ClubMembership,
  type MembershipRole,
  type MembershipStatus,
} from "../../entity/ClubMembership";
import {
  Event,
  type EventCategory,
  type EventStatus,
} from "../../entity/Event";
import {
  EventRegistration,
  type RegistrationStatus,
} from "../../entity/EventRegistration";
import { User, type UserRole } from "../../entity/User";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "../../utils/AppError";
import { deleteObjectQuietly, objectKey, publicUrl } from "../../utils/storage";
import { findClubMembership, requireClubLeader } from "../club/club.service";
import { attachUpload } from "../upload/upload.service";
import type {
  CreateEventInput,
  ListEventsInput,
  UpdateEventInput,
} from "./event.schema";

export interface Actor {
  id: string;
  role: UserRole;
  collegeId: string;
}

interface ViewerMembership {
  role: MembershipRole;
  status: MembershipStatus;
}

export interface EventViewer {
  manages: boolean;
  isOrganizer: boolean;
  membership: MembershipStatus | null;
}

export interface EventClubDto {
  id: string;
  name: string;
  slug: string;
}

export interface EventDto {
  id: string;
  title: string;
  slug: string;
  category: EventCategory;
  description: string | null;
  bannerUrl: string | null;
  venue: string | null;
  startsAt: Date | null;
  endsAt: Date | null;
  capacity: number | null;
  status: EventStatus;
  registeredCount: number;
  club: EventClubDto;
  viewer: EventViewer;
}

export interface EventPersonDto {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
}

export interface EventDetailDto extends EventDto {
  organizer: EventPersonDto | null;
}

const PUBLISHED_EDITABLE = new Set([
  "description",
  "venue",
  "organizerUserId",
  "bannerUploadId",
]);

const ACTIVE_REGISTRATIONS: RegistrationStatus[] = ["registered", "checked_in"];

function events() {
  return AppDataSource.getRepository(Event);
}

function registrations() {
  return AppDataSource.getRepository(EventRegistration);
}

function toEventDto(
  event: Event,
  club: EventClubDto,
  registeredCount: number,
  viewer: EventViewer,
): EventDto {
  return {
    id: event.id,
    title: event.title,
    slug: event.slug,
    category: event.category,
    description: event.description,
    bannerUrl: publicUrl(event.bannerKey),
    venue: event.venue,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    capacity: event.capacity,
    status: event.status,
    registeredCount,
    club,
    viewer,
  };
}

function toViewer(
  event: Event,
  actorId: string,
  membership: ViewerMembership | null,
): EventViewer {
  return {
    manages: membership?.role === "leader" && membership.status === "approved",
    isOrganizer: event.organizerId === actorId,
    membership: membership?.status ?? null,
  };
}

async function loadEvent(
  collegeId: string,
  slug: string,
): Promise<Event & { club: Club }> {
  const event = await events().findOne({
    where: { collegeId, slug },
    relations: { club: true },
  });

  if (!event) {
    throw new NotFoundError("Event not found");
  }

  return event as Event & { club: Club };
}

async function countRegistrations(eventId: string): Promise<number> {
  return registrations().countBy({
    eventId,
    status: In(ACTIVE_REGISTRATIONS),
  });
}

async function loadOrganizer(
  organizerId: string | null,
): Promise<EventPersonDto | null> {
  if (!organizerId) {
    return null;
  }

  const user = await AppDataSource.getRepository(User).findOneBy({
    id: organizerId,
  });

  return user
    ? {
        userId: user.id,
        fullName: user.fullName,
        avatarUrl: publicUrl(user.avatarKey),
      }
    : null;
}

async function requireApprovedMember(
  clubId: string,
  userId: string,
  field: string,
): Promise<void> {
  const membership = await findClubMembership(clubId, userId);

  if (!membership || membership.status !== "approved") {
    throw new ValidationError("Invalid input", [
      {
        field,
        message: "This student is not a member of the club running this event",
      },
    ]);
  }
}

function assertTimeOrder(startsAt: Date | null, endsAt: Date | null): void {
  if (startsAt && endsAt && startsAt >= endsAt) {
    throw new ValidationError("Invalid input", [
      { field: "endsAt", message: "The event must end after it starts" },
    ]);
  }
}

async function detailFor(
  actor: Actor,
  event: Event & { club: Club },
  membership: ViewerMembership | null,
): Promise<EventDetailDto> {
  const [registeredCount, organizer] = await Promise.all([
    countRegistrations(event.id),
    loadOrganizer(event.organizerId),
  ]);

  const club = {
    id: event.club.id,
    name: event.club.name,
    slug: event.club.slug,
  };

  return {
    ...toEventDto(
      event,
      club,
      registeredCount,
      toViewer(event, actor.id, membership),
    ),
    organizer,
  };
}

export async function createEvent(
  actor: Actor,
  input: CreateEventInput,
): Promise<EventDetailDto> {
  const club = await AppDataSource.getRepository(Club).findOneBy({
    collegeId: actor.collegeId,
    slug: input.clubSlug,
  });

  if (!club) {
    throw new NotFoundError("Club not found");
  }

  await requireClubLeader(club.id, actor.id);

  if (club.status !== "approved") {
    throw new ConflictError("This club is not approved yet");
  }

  if (
    await events().existsBy({ collegeId: actor.collegeId, slug: input.slug })
  ) {
    throw new ConflictError("An event with this slug already exists");
  }

  const startsAt = input.startsAt ?? null;
  const endsAt = input.endsAt ?? null;

  assertTimeOrder(startsAt, endsAt);

  const eventId = crypto.randomUUID();

  const bannerKey = input.bannerUploadId
    ? await attachUpload(
        actor.id,
        "event_banner",
        input.bannerUploadId,
        objectKey("events", eventId, "banner"),
      )
    : null;

  const event = await events().save(
    events().create({
      id: eventId,
      collegeId: actor.collegeId,
      clubId: club.id,
      organizerId: null,
      title: input.title,
      slug: input.slug,
      description: input.description ?? null,
      category: input.category,
      startsAt,
      endsAt,
      capacity: input.capacity ?? null,
      venue: input.venue ?? null,
      bannerKey,
      status: "draft",
    }),
  );

  event.club = club;

  return detailFor(actor, event as Event & { club: Club }, {
    role: "leader",
    status: "approved",
  });
}

export async function listEvents(
  actor: Actor,
  input: ListEventsInput,
): Promise<{ events: EventDto[]; total: number; page: number; limit: number }> {
  const query = events()
    .createQueryBuilder("event")
    .innerJoinAndSelect("event.club", "club")
    .where("event.college_id = :collegeId", { collegeId: actor.collegeId });

  if (input.manage) {
    query.andWhere(
      `(event.organizer_id = :actorId OR event.club_id IN (
         SELECT m.club_id FROM club_memberships m
         WHERE m.student_id = :actorId AND m.role = 'leader' AND m.status = 'approved'
       ))`,
      { actorId: actor.id },
    );

    if (input.status) {
      query.andWhere("event.status = :status", { status: input.status });
    }
  } else {
    query.andWhere("event.status = :published", { published: "published" });
  }

  if (input.search) {
    query.andWhere(
      "(event.title ILIKE :search OR event.description ILIKE :search)",
      { search: `%${input.search}%` },
    );
  }

  if (input.category) {
    query.andWhere("event.category = :category", { category: input.category });
  }

  if (input.club) {
    query.andWhere("club.slug = :clubSlug", { clubSlug: input.club });
  }

  if (input.from) {
    query.andWhere("event.starts_at >= :from", { from: input.from });
  }

  if (input.to) {
    query.andWhere("event.starts_at <= :to", { to: input.to });
  }

  const [rows, total] = await query
    .orderBy("event.startsAt", "ASC", "NULLS LAST")
    .addOrderBy("event.createdAt", "DESC")
    .skip((input.page - 1) * input.limit)
    .take(input.limit)
    .getManyAndCount();

  const counts = new Map<string, number>();
  const memberships = new Map<string, ViewerMembership>();

  if (rows.length > 0) {
    const countRows = await registrations()
      .createQueryBuilder("registration")
      .select("registration.event_id", "eventId")
      .addSelect("COUNT(*)", "count")
      .where("registration.event_id IN (:...ids)", {
        ids: rows.map((event) => event.id),
      })
      .andWhere("registration.status IN (:...statuses)", {
        statuses: ACTIVE_REGISTRATIONS,
      })
      .groupBy("registration.event_id")
      .getRawMany<{ eventId: string; count: string }>();

    for (const row of countRows) {
      counts.set(row.eventId, Number(row.count));
    }

    const mine = await AppDataSource.getRepository(ClubMembership).findBy({
      clubId: In([...new Set(rows.map((event) => event.clubId))]),
      studentId: actor.id,
    });

    for (const membership of mine) {
      memberships.set(membership.clubId, {
        role: membership.role,
        status: membership.status,
      });
    }
  }

  return {
    events: rows.map((event) =>
      toEventDto(
        event,
        {
          id: event.club.id,
          name: event.club.name,
          slug: event.club.slug,
        },
        counts.get(event.id) ?? 0,
        toViewer(event, actor.id, memberships.get(event.clubId) ?? null),
      ),
    ),
    total,
    page: input.page,
    limit: input.limit,
  };
}

export async function getEvent(
  actor: Actor,
  slug: string,
): Promise<EventDetailDto> {
  const event = await loadEvent(actor.collegeId, slug);
  const membership = await findClubMembership(event.clubId, actor.id);

  const viewer = toViewer(event, actor.id, membership);

  if (event.status === "draft" && !viewer.manages && !viewer.isOrganizer) {
    throw new NotFoundError("Event not found");
  }

  return detailFor(actor, event, membership);
}

export async function updateEvent(
  actor: Actor,
  slug: string,
  input: UpdateEventInput,
): Promise<EventDetailDto> {
  const event = await loadEvent(actor.collegeId, slug);
  await requireClubLeader(event.clubId, actor.id);

  if (event.status === "cancelled" || event.resultsPublishedAt) {
    throw new ConflictError("This event can no longer be edited");
  }

  if (event.status === "published") {
    const locked = Object.keys(input).filter(
      (field) => !PUBLISHED_EDITABLE.has(field),
    );

    if (locked.length > 0) {
      throw new ValidationError(
        "Invalid input",
        locked.map((field) => ({
          field,
          message: "This cannot change once the event is published",
        })),
      );
    }
  }

  if (input.organizerUserId) {
    await requireApprovedMember(
      event.clubId,
      input.organizerUserId,
      "organizerUserId",
    );
  }

  assertTimeOrder(
    input.startsAt !== undefined ? input.startsAt : event.startsAt,
    input.endsAt !== undefined ? input.endsAt : event.endsAt,
  );

  const bannerKey = input.bannerUploadId
    ? await attachUpload(
        actor.id,
        "event_banner",
        input.bannerUploadId,
        objectKey("events", event.id, "banner"),
      )
    : null;

  const previousBannerKey = event.bannerKey;

  if (input.title !== undefined) {
    event.title = input.title;
  }
  if (input.category !== undefined) {
    event.category = input.category;
  }
  if (input.description !== undefined) {
    event.description = input.description;
  }
  if (input.startsAt !== undefined) {
    event.startsAt = input.startsAt;
  }
  if (input.endsAt !== undefined) {
    event.endsAt = input.endsAt;
  }
  if (input.capacity !== undefined) {
    event.capacity = input.capacity;
  }
  if (input.venue !== undefined) {
    event.venue = input.venue;
  }
  if (input.organizerUserId !== undefined) {
    event.organizerId = input.organizerUserId;
  }
  if (bannerKey) {
    event.bannerKey = bannerKey;
  }

  await events().save(event);

  if (bannerKey) {
    await deleteObjectQuietly(previousBannerKey);
  }

  return detailFor(actor, event, { role: "leader", status: "approved" });
}

export async function setEventStatus(
  actor: Actor,
  slug: string,
  status: "published" | "cancelled",
): Promise<EventDetailDto> {
  const event = await loadEvent(actor.collegeId, slug);
  await requireClubLeader(event.clubId, actor.id);

  if (event.resultsPublishedAt) {
    throw new ConflictError("Results are published, this event is locked");
  }

  if (status === "published") {
    if (event.status === "cancelled") {
      throw new ConflictError("A cancelled event cannot be republished");
    }

    if (event.status !== "draft") {
      throw new ConflictError("This event is already published");
    }

    if (!event.startsAt || !event.endsAt) {
      throw new ConflictError("Set a start and end time before publishing");
    }
  }

  if (status === "cancelled" && event.status !== "published") {
    throw new ConflictError("Only a published event can be cancelled");
  }

  event.status = status;
  await events().save(event);

  return detailFor(actor, event, { role: "leader", status: "approved" });
}

export async function deleteEvent(actor: Actor, slug: string): Promise<void> {
  const event = await loadEvent(actor.collegeId, slug);
  await requireClubLeader(event.clubId, actor.id);

  if (event.status !== "draft") {
    throw new ConflictError("A published event can be cancelled, not deleted");
  }

  await events().delete({ id: event.id });
  await deleteObjectQuietly(event.bannerKey);
}
