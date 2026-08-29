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
  type ResultType,
} from "../../entity/EventRegistration";
import { User, type UserRole } from "../../entity/User";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "../../utils/AppError";
import { deleteObjectQuietly, objectKey, publicUrl } from "../../utils/storage";
import { mintCertificates } from "../certificate/certificate.service";
import { findClubMembership, requireClubLeader } from "../club/club.service";
import { notify } from "../notification/notification.service";
import { attachUpload } from "../upload/upload.service";
import type {
  CreateEventInput,
  ListEventsInput,
  ListRegistrationsInput,
  PublishResultsInput,
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

export interface ViewerRegistration {
  status: RegistrationStatus;
  result: ResultType | null;
  registeredAt: Date;
}

export interface EventViewer {
  manages: boolean;
  isOrganizer: boolean;
  membership: MembershipStatus | null;
  registration: ViewerRegistration | null;
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

export interface EventResultDto extends EventPersonDto {
  result: ResultType;
}

export interface EventDetailDto extends EventDto {
  organizer: EventPersonDto | null;
  results: EventResultDto[] | null;
}

export interface RegistrationDto {
  id: string;
  status: RegistrationStatus;
  result: ResultType | null;
  registeredAt: Date;
  checkedInAt: Date | null;
}

export interface RegistrationRowDto extends RegistrationDto {
  student: EventPersonDto;
}

const PUBLISHED_EDITABLE = new Set([
  "description",
  "venue",
  "organizerUserId",
  "bannerUploadId",
]);

const ACTIVE_REGISTRATIONS: RegistrationStatus[] = ["registered", "checked_in"];

const CHECKIN_LEAD_MS = 24 * 60 * 60 * 1000;

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

function resultOf(registration: EventRegistration): ResultType | null {
  if (registration.status !== "checked_in") {
    return null;
  }

  return registration.result ?? "participant";
}

function toRegistrationDto(registration: EventRegistration): RegistrationDto {
  return {
    id: registration.id,
    status: registration.status,
    result: resultOf(registration),
    registeredAt: registration.registeredAt,
    checkedInAt: registration.checkedInAt,
  };
}

function isEventOrganizer(
  event: Event,
  actorId: string,
  membership: ViewerMembership | null,
): boolean {
  return event.organizerId === actorId && membership?.status === "approved";
}

function toViewer(
  event: Event,
  actorId: string,
  membership: ViewerMembership | null,
  registration: EventRegistration | null,
): EventViewer {
  return {
    manages: membership?.role === "leader" && membership.status === "approved",
    isOrganizer: isEventOrganizer(event, actorId, membership),
    membership: membership?.status ?? null,
    registration: registration
      ? {
          status: registration.status,
          result: event.resultsPublishedAt ? resultOf(registration) : null,
          registeredAt: registration.registeredAt,
        }
      : null,
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

async function loadPodium(event: Event): Promise<EventResultDto[] | null> {
  if (!event.resultsPublishedAt) {
    return null;
  }

  const rows = await registrations()
    .createQueryBuilder("registration")
    .innerJoin(User, "user", "user.id = registration.studentId")
    .select("user.id", "userId")
    .addSelect("user.fullName", "fullName")
    .addSelect("user.avatarKey", "avatarKey")
    .addSelect("registration.result", "result")
    .where("registration.event_id = :eventId", { eventId: event.id })
    .andWhere("registration.result IN (:...results)", {
      results: ["winner", "runner_up"],
    })
    .orderBy(
      "CASE WHEN registration.result = 'winner' THEN 0 ELSE 1 END",
      "ASC",
    )
    .addOrderBy("user.full_name", "ASC")
    .getRawMany<{
      userId: string;
      fullName: string;
      avatarKey: string | null;
      result: ResultType;
    }>();

  return rows.map((row) => ({
    userId: row.userId,
    fullName: row.fullName,
    avatarUrl: publicUrl(row.avatarKey),
    result: row.result,
  }));
}

async function requireEventManager(
  event: Event,
  actor: Actor,
): Promise<ViewerMembership> {
  const membership = await findClubMembership(event.clubId, actor.id);

  const isLeader =
    membership?.status === "approved" && membership.role === "leader";
  const isOrganizer = isEventOrganizer(event, actor.id, membership);

  if (!membership || (!isLeader && !isOrganizer)) {
    throw new ForbiddenError(
      "Only the club leader or the event organizer can do this",
    );
  }

  return membership;
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

async function requireNotRegistered(
  eventId: string,
  userId: string,
  field: string,
): Promise<void> {
  const registered = await registrations().existsBy({
    eventId,
    studentId: userId,
    status: In(ACTIVE_REGISTRATIONS),
  });

  if (registered) {
    throw new ValidationError("Invalid input", [
      {
        field,
        message: "This student is registered for the event, so cannot organise it",
      },
    ]);
  }
}

async function findLeaderId(clubId: string): Promise<string | null> {
  const leader = await AppDataSource.getRepository(ClubMembership).findOneBy({
    clubId,
    role: "leader",
    status: "approved",
  });

  return leader?.studentId ?? null;
}

function assertTimeOrder(startsAt: Date | null, endsAt: Date | null): void {
  if (startsAt && endsAt && startsAt >= endsAt) {
    throw new ValidationError("Invalid input", [
      { field: "endsAt", message: "The event must end after it starts" },
    ]);
  }
}

function assertStartsInFuture(startsAt: Date | null): void {
  if (startsAt && startsAt.getTime() <= Date.now()) {
    throw new ValidationError("Invalid input", [
      { field: "startsAt", message: "The event must start in the future" },
    ]);
  }
}

async function detailFor(
  actor: Actor,
  event: Event & { club: Club },
  membership: ViewerMembership | null,
): Promise<EventDetailDto> {
  const [registeredCount, organizer, registration, results] = await Promise.all(
    [
      countRegistrations(event.id),
      loadOrganizer(event.organizerId),
      registrations().findOneBy({ eventId: event.id, studentId: actor.id }),
      loadPodium(event),
    ],
  );

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
      toViewer(event, actor.id, membership, registration),
    ),
    organizer,
    results,
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
  assertStartsInFuture(startsAt);

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
  } else if (input.registered) {
    query.andWhere("event.status IN (:...statuses)", {
      statuses: ["published", "cancelled"],
    });
  } else {
    query.andWhere("event.status = :published", { published: "published" });
  }

  if (input.registered) {
    query.andWhere(
      `EXISTS (
         SELECT 1 FROM event_registrations r
         WHERE r.event_id = event.id
           AND r.student_id = :actorId
           AND r.status <> 'cancelled'
       )`,
      { actorId: actor.id },
    );
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

  if (input.available) {
    query.andWhere("event.checkin_opened_at IS NULL").andWhere(
      `(event.capacity IS NULL OR event.capacity > (
         SELECT COUNT(*) FROM event_registrations r
         WHERE r.event_id = event.id AND r.status IN (:...activeStatuses)
       ))`,
      { activeStatuses: ACTIVE_REGISTRATIONS },
    );
  }

  if (input.from) {
    query.andWhere("event.starts_at >= :from", { from: input.from });
  }

  if (input.to) {
    query.andWhere("event.starts_at <= :to", { to: input.to });
  }

  if (input.sort === "newest") {
    query.orderBy("event.createdAt", "DESC");
  } else if (input.sort === "latest") {
    query
      .orderBy("event.startsAt", "DESC", "NULLS LAST")
      .addOrderBy("event.createdAt", "DESC");
  } else {
    query
      .orderBy("event.startsAt", "ASC", "NULLS LAST")
      .addOrderBy("event.createdAt", "DESC");
  }

  const [rows, total] = await query
    .skip((input.page - 1) * input.limit)
    .take(input.limit)
    .getManyAndCount();

  const counts = new Map<string, number>();
  const memberships = new Map<string, ViewerMembership>();
  const mineByEvent = new Map<string, EventRegistration>();

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

    const mineRegistrations = await registrations().findBy({
      eventId: In(rows.map((event) => event.id)),
      studentId: actor.id,
    });

    for (const registration of mineRegistrations) {
      mineByEvent.set(registration.eventId, registration);
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
        toViewer(
          event,
          actor.id,
          memberships.get(event.clubId) ?? null,
          mineByEvent.get(event.id) ?? null,
        ),
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

  const viewer = toViewer(event, actor.id, membership, null);

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
    await requireNotRegistered(
      event.id,
      input.organizerUserId,
      "organizerUserId",
    );
  }

  assertTimeOrder(
    input.startsAt !== undefined ? input.startsAt : event.startsAt,
    input.endsAt !== undefined ? input.endsAt : event.endsAt,
  );

  if (input.startsAt !== undefined) {
    assertStartsInFuture(input.startsAt);
  }

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

async function activeRegistrantIds(eventId: string): Promise<string[]> {
  const rows = await registrations().find({
    where: { eventId, status: In(ACTIVE_REGISTRATIONS) },
    select: { studentId: true },
  });

  return rows.map((row) => row.studentId);
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

    if (event.startsAt.getTime() <= Date.now()) {
      throw new ConflictError("Move the start time forward before publishing");
    }
  }

  if (status === "cancelled" && event.status !== "published") {
    throw new ConflictError("Only a published event can be cancelled");
  }

  event.status = status;
  await events().save(event);

  if (status === "published") {
    const audience = await AppDataSource.getRepository(ClubMembership).find({
      where: {
        collegeId: actor.collegeId,
        clubId: event.clubId,
        status: "approved",
      },
      select: { studentId: true },
    });

    await notify(
      audience
        .map((membership) => membership.studentId)
        .filter((userId) => userId !== actor.id),
      {
        type: "event_published",
        title: `${event.title} is open for registration`,
        link: `/events/${event.slug}`,
      },
    );
  } else {
    await notify(await activeRegistrantIds(event.id), {
      type: "event_cancelled",
      title: `${event.title} was cancelled`,
      link: `/events/${event.slug}`,
    });
  }

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

export async function registerForEvent(
  actor: Actor,
  slug: string,
): Promise<RegistrationDto> {
  const event = await loadEvent(actor.collegeId, slug);

  if (event.status !== "published") {
    throw new ConflictError("This event is not open for registration");
  }

  if (event.checkinOpenedAt) {
    throw new ConflictError("Registration has closed for this event");
  }

  const membership = await findClubMembership(event.clubId, actor.id);

  if (membership?.status !== "approved") {
    throw new ForbiddenError("Join this club to register for its events");
  }

  if (event.organizerId === actor.id) {
    throw new ForbiddenError(
      "You are organising this event, so you cannot register for it",
    );
  }

  const registration = await AppDataSource.transaction(async (manager) => {
    const locked = await manager.findOne(Event, {
      where: { id: event.id },
      lock: { mode: "pessimistic_write" },
    });

    if (!locked) {
      throw new NotFoundError("Event not found");
    }

    if (locked.status !== "published" || locked.checkinOpenedAt) {
      throw new ConflictError("Registration has closed for this event");
    }

    const existing = await manager.findOneBy(EventRegistration, {
      eventId: event.id,
      studentId: actor.id,
    });

    if (existing && existing.status !== "cancelled") {
      throw new ConflictError("You are already registered for this event");
    }

    if (locked.capacity !== null) {
      const taken = await manager.countBy(EventRegistration, {
        eventId: event.id,
        status: In(ACTIVE_REGISTRATIONS),
      });

      if (taken >= locked.capacity) {
        throw new ConflictError("This event is full");
      }
    }

    if (existing) {
      existing.status = "registered";
      return manager.save(existing);
    }

    return manager.save(
      manager.create(EventRegistration, {
        collegeId: actor.collegeId,
        eventId: event.id,
        studentId: actor.id,
        status: "registered",
      }),
    );
  });

  return toRegistrationDto(registration);
}

export async function cancelRegistration(
  actor: Actor,
  slug: string,
): Promise<void> {
  const event = await loadEvent(actor.collegeId, slug);

  const registration = await registrations().findOneBy({
    eventId: event.id,
    studentId: actor.id,
  });

  if (!registration || registration.status === "cancelled") {
    throw new NotFoundError("You are not registered for this event");
  }

  if (event.checkinOpenedAt) {
    throw new ConflictError("Registration has closed for this event");
  }

  registration.status = "cancelled";
  await registrations().save(registration);
}

export async function listRegistrations(
  actor: Actor,
  slug: string,
  input: ListRegistrationsInput,
): Promise<{
  registrations: RegistrationRowDto[];
  total: number;
  page: number;
  limit: number;
}> {
  const event = await loadEvent(actor.collegeId, slug);
  await requireEventManager(event, actor);

  const query = registrations()
    .createQueryBuilder("registration")
    .innerJoin(User, "user", "user.id = registration.studentId")
    .where("registration.event_id = :eventId", { eventId: event.id });

  if (input.status) {
    query.andWhere("registration.status = :status", { status: input.status });
  }

  if (input.result === "participant") {
    query
      .andWhere("registration.status = :checkedIn", { checkedIn: "checked_in" })
      .andWhere("registration.result IS NULL");
  } else if (input.result) {
    query.andWhere("registration.result = :result", { result: input.result });
  }

  if (input.search) {
    query.andWhere("user.full_name ILIKE :search", {
      search: `%${input.search}%`,
    });
  }

  const total = await query.getCount();

  const rows = await query
    .select("registration.id", "id")
    .addSelect("registration.status", "status")
    .addSelect("registration.result", "result")
    .addSelect("registration.registered_at", "registeredAt")
    .addSelect("registration.checked_in_at", "checkedInAt")
    .addSelect("user.id", "userId")
    .addSelect("user.fullName", "fullName")
    .addSelect("user.avatarKey", "avatarKey")
    .orderBy("user.full_name", "ASC")
    .offset((input.page - 1) * input.limit)
    .limit(input.limit)
    .getRawMany<{
      id: string;
      status: RegistrationStatus;
      result: ResultType | null;
      registeredAt: Date;
      checkedInAt: Date | null;
      userId: string;
      fullName: string;
      avatarKey: string | null;
    }>();

  return {
    registrations: rows.map((row) => ({
      id: row.id,
      status: row.status,
      result:
        row.status === "checked_in" ? (row.result ?? "participant") : null,
      registeredAt: row.registeredAt,
      checkedInAt: row.checkedInAt,
      student: {
        userId: row.userId,
        fullName: row.fullName,
        avatarUrl: publicUrl(row.avatarKey),
      },
    })),
    total,
    page: input.page,
    limit: input.limit,
  };
}

export async function openCheckin(
  actor: Actor,
  slug: string,
): Promise<EventDetailDto> {
  const event = await loadEvent(actor.collegeId, slug);
  const membership = await requireEventManager(event, actor);

  if (event.status !== "published") {
    throw new ConflictError("Only a published event can open check-in");
  }

  if (event.checkinOpenedAt) {
    throw new ConflictError("Check-in is already open");
  }

  if (
    event.startsAt &&
    Date.now() < event.startsAt.getTime() - CHECKIN_LEAD_MS
  ) {
    throw new ConflictError(
      "Check-in opens 24 hours before the event starts",
    );
  }

  event.checkinOpenedAt = new Date();
  await events().save(event);

  return detailFor(actor, event, membership);
}

export async function checkInRegistration(
  actor: Actor,
  slug: string,
  userId: string,
): Promise<RegistrationDto> {
  const event = await loadEvent(actor.collegeId, slug);
  await requireEventManager(event, actor);

  if (!event.checkinOpenedAt) {
    throw new ConflictError("Open check-in before marking attendance");
  }

  if (event.resultsPublishedAt) {
    throw new ConflictError("Results are published, this event is locked");
  }

  const registration = await registrations().findOneBy({
    eventId: event.id,
    studentId: userId,
  });

  if (!registration) {
    throw new NotFoundError("This student is not registered for this event");
  }

  if (registration.status === "cancelled") {
    throw new ConflictError("This student cancelled their registration");
  }

  if (registration.status === "checked_in") {
    throw new ConflictError("This student is already checked in");
  }

  registration.status = "checked_in";
  registration.checkedInAt = new Date();
  await registrations().save(registration);

  return toRegistrationDto(registration);
}

export async function publishResults(
  actor: Actor,
  slug: string,
  input: PublishResultsInput,
): Promise<EventDetailDto> {
  const event = await loadEvent(actor.collegeId, slug);
  const membership = await requireEventManager(event, actor);

  if (event.resultsPublishedAt) {
    throw new ConflictError("Results are already published");
  }

  if (event.status !== "published") {
    throw new ConflictError("Only a published event can have results");
  }

  if (!event.checkinOpenedAt) {
    throw new ConflictError("Open check-in before publishing results");
  }

  if (event.startsAt && Date.now() < event.startsAt.getTime()) {
    throw new ConflictError("Results cannot be published before the event starts");
  }

  const named = [
    ...(input.winnerUserId
      ? [{ userId: input.winnerUserId, field: "winnerUserId" }]
      : []),
    ...input.runnerUpUserIds.map((userId, index) => ({
      userId,
      field: `runnerUpUserIds.${index}`,
    })),
  ];

  if (named.length > 0) {
    const leaderId = await findLeaderId(event.clubId);
    const running = new Set(
      [event.organizerId, leaderId].filter((id): id is string => id !== null),
    );
    const staff = named.filter((entry) => running.has(entry.userId));

    if (staff.length > 0) {
      throw new ValidationError(
        "Invalid input",
        staff.map((entry) => ({
          field: entry.field,
          message: "Whoever runs the event cannot be on its podium",
        })),
      );
    }

    const attended = await registrations().findBy({
      eventId: event.id,
      studentId: In(named.map((entry) => entry.userId)),
      status: "checked_in",
    });

    const checkedIn = new Set(attended.map((row) => row.studentId));
    const missing = named.filter((entry) => !checkedIn.has(entry.userId));

    if (missing.length > 0) {
      throw new ValidationError(
        "Invalid input",
        missing.map((entry) => ({
          field: entry.field,
          message: "This student was not checked in at the event",
        })),
      );
    }
  }

  const publishedAt = new Date();

  await AppDataSource.transaction(async (manager) => {
    if (input.winnerUserId) {
      await manager.update(
        EventRegistration,
        { eventId: event.id, studentId: input.winnerUserId },
        { result: "winner" },
      );
    }

    if (input.runnerUpUserIds.length > 0) {
      await manager.update(
        EventRegistration,
        { eventId: event.id, studentId: In(input.runnerUpUserIds) },
        { result: "runner_up" },
      );
    }

    await manager.update(
      Event,
      { id: event.id },
      { resultsPublishedAt: publishedAt },
    );

    await mintCertificates(manager, event);
  });

  event.resultsPublishedAt = publishedAt;

  await notify(await activeRegistrantIds(event.id), {
    type: "results_published",
    title: `Results are out for ${event.title}`,
    link: `/events/${event.slug}`,
  });

  return detailFor(actor, event, membership);
}
