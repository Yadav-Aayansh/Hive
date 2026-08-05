import { In } from "typeorm";
import { AppDataSource } from "../../config/data-source";
import { Announcement } from "../../entity/Announcement";
import { Club } from "../../entity/Club";
import { ClubMembership } from "../../entity/ClubMembership";
import { User, type UserRole } from "../../entity/User";
import { ForbiddenError, NotFoundError } from "../../utils/AppError";
import { publicUrl } from "../../utils/storage";
import { findClubMembership, requireClubLeader } from "../club/club.service";
import type {
  CreateAnnouncementInput,
  ListAnnouncementsInput,
  UpdateAnnouncementInput,
} from "./announcement.schema";

export interface Actor {
  id: string;
  role: UserRole;
  collegeId: string;
}

export interface AnnouncementAuthorDto {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
}

export interface AnnouncementClubDto {
  slug: string;
  name: string;
}

export interface AnnouncementDto {
  id: string;
  title: string;
  body: string;
  createdAt: Date;
  updatedAt: Date;
  club: AnnouncementClubDto;
  author: AnnouncementAuthorDto;
  canManage: boolean;
}

function announcements() {
  return AppDataSource.getRepository(Announcement);
}

function clubs() {
  return AppDataSource.getRepository(Club);
}

function memberships() {
  return AppDataSource.getRepository(ClubMembership);
}

function users() {
  return AppDataSource.getRepository(User);
}

function toAuthorDto(user: User): AnnouncementAuthorDto {
  return {
    userId: user.id,
    fullName: user.fullName,
    avatarUrl: publicUrl(user.avatarKey),
  };
}

function toAnnouncementDto(
  announcement: Announcement,
  club: Club,
  author: AnnouncementAuthorDto,
  canManage: boolean,
): AnnouncementDto {
  return {
    id: announcement.id,
    title: announcement.title,
    body: announcement.body,
    createdAt: announcement.createdAt,
    updatedAt: announcement.updatedAt,
    club: { slug: club.slug, name: club.name },
    author,
    canManage,
  };
}

async function loadAnnouncement(
  collegeId: string,
  id: string,
): Promise<Announcement> {
  const announcement = await announcements().findOneBy({ collegeId, id });

  if (!announcement) {
    throw new NotFoundError("Announcement not found");
  }

  return announcement;
}

async function loadClubBySlug(collegeId: string, slug: string): Promise<Club> {
  const club = await clubs().findOneBy({ collegeId, slug });

  if (!club) {
    throw new NotFoundError("Club not found");
  }

  return club;
}

async function loadClubById(collegeId: string, id: string): Promise<Club> {
  const club = await clubs().findOneBy({ collegeId, id });

  if (!club) {
    throw new NotFoundError("Club not found");
  }

  return club;
}

async function loadAuthor(userId: string): Promise<AnnouncementAuthorDto> {
  const user = await users().findOneBy({ id: userId });

  if (!user) {
    throw new NotFoundError("Author not found");
  }

  return toAuthorDto(user);
}

async function requireClubAudience(club: Club, actor: Actor): Promise<void> {
  if (actor.role === "campus_admin" && club.type === "official") {
    return;
  }

  const membership = await findClubMembership(club.id, actor.id);

  if (membership?.status !== "approved") {
    throw new ForbiddenError("Join this club to see its announcements");
  }
}

async function audienceClubIds(actor: Actor): Promise<string[]> {
  if (actor.role === "campus_admin") {
    const rows = await clubs().find({
      where: { collegeId: actor.collegeId, type: "official" },
      select: { id: true },
    });

    return rows.map((club) => club.id);
  }

  const rows = await memberships().find({
    where: {
      collegeId: actor.collegeId,
      studentId: actor.id,
      status: "approved",
    },
    select: { clubId: true },
  });

  return rows.map((membership) => membership.clubId);
}

async function leadClubIds(actor: Actor): Promise<Set<string>> {
  if (actor.role !== "student") {
    return new Set();
  }

  const rows = await memberships().find({
    where: {
      collegeId: actor.collegeId,
      studentId: actor.id,
      role: "leader",
      status: "approved",
    },
    select: { clubId: true },
  });

  return new Set(rows.map((membership) => membership.clubId));
}

export async function createAnnouncement(
  actor: Actor,
  input: CreateAnnouncementInput,
): Promise<AnnouncementDto> {
  const club = await loadClubBySlug(actor.collegeId, input.clubSlug);
  await requireClubLeader(club.id, actor.id);

  const announcement = await announcements().save(
    announcements().create({
      collegeId: actor.collegeId,
      clubId: club.id,
      authorId: actor.id,
      title: input.title,
      body: input.body,
    }),
  );

  const author = await loadAuthor(actor.id);

  return toAnnouncementDto(announcement, club, author, true);
}

export async function listAnnouncements(
  actor: Actor,
  input: ListAnnouncementsInput,
): Promise<{
  announcements: AnnouncementDto[];
  total: number;
  page: number;
  limit: number;
}> {
  const query = announcements()
    .createQueryBuilder("announcement")
    .where("announcement.college_id = :collegeId", {
      collegeId: actor.collegeId,
    });

  if (input.club) {
    const club = await loadClubBySlug(actor.collegeId, input.club);
    await requireClubAudience(club, actor);

    query.andWhere("announcement.club_id = :clubId", { clubId: club.id });
  } else {
    const clubIds = await audienceClubIds(actor);

    if (clubIds.length === 0) {
      return {
        announcements: [],
        total: 0,
        page: input.page,
        limit: input.limit,
      };
    }

    query.andWhere("announcement.club_id IN (:...clubIds)", { clubIds });
  }

  if (input.search) {
    query.andWhere("announcement.title ILIKE :search", {
      search: `%${input.search}%`,
    });
  }

  const [rows, total] = await query
    .orderBy("announcement.createdAt", "DESC")
    .skip((input.page - 1) * input.limit)
    .take(input.limit)
    .getManyAndCount();

  if (rows.length === 0) {
    return { announcements: [], total, page: input.page, limit: input.limit };
  }

  const [clubRows, authorRows, leads] = await Promise.all([
    clubs().findBy({ id: In([...new Set(rows.map((row) => row.clubId))]) }),
    users().findBy({ id: In([...new Set(rows.map((row) => row.authorId))]) }),
    leadClubIds(actor),
  ]);

  const clubById = new Map(clubRows.map((club) => [club.id, club]));
  const authorById = new Map(
    authorRows.map((user) => [user.id, toAuthorDto(user)]),
  );

  return {
    announcements: rows.flatMap((row) => {
      const club = clubById.get(row.clubId);
      const author = authorById.get(row.authorId);

      return club && author
        ? [toAnnouncementDto(row, club, author, leads.has(row.clubId))]
        : [];
    }),
    total,
    page: input.page,
    limit: input.limit,
  };
}

export async function updateAnnouncement(
  actor: Actor,
  id: string,
  input: UpdateAnnouncementInput,
): Promise<AnnouncementDto> {
  const announcement = await loadAnnouncement(actor.collegeId, id);
  const club = await loadClubById(actor.collegeId, announcement.clubId);
  await requireClubLeader(club.id, actor.id);

  if (input.title !== undefined) {
    announcement.title = input.title;
  }
  if (input.body !== undefined) {
    announcement.body = input.body;
  }

  await announcements().save(announcement);

  const author = await loadAuthor(announcement.authorId);

  return toAnnouncementDto(announcement, club, author, true);
}

export async function deleteAnnouncement(
  actor: Actor,
  id: string,
): Promise<void> {
  const announcement = await loadAnnouncement(actor.collegeId, id);
  await requireClubLeader(announcement.clubId, actor.id);

  await announcements().delete({ id: announcement.id });
}
