import crypto from "node:crypto";
import { In } from "typeorm";
import { AppDataSource } from "../../config/data-source";
import {
  Club,
  type ClubCategory,
  type ClubStatus,
  type ClubType,
} from "../../entity/Club";
import {
  ClubMembership,
  type MembershipRole,
  type MembershipStatus,
} from "../../entity/ClubMembership";
import { User, type UserRole } from "../../entity/User";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "../../utils/AppError";
import { deleteObjectQuietly, objectKey, publicUrl } from "../../utils/storage";
import { attachUpload } from "../upload/upload.service";
import type {
  CreateClubInput,
  ListClubsInput,
  UpdateClubInput,
} from "./club.schema";

export interface Actor {
  id: string;
  role: UserRole;
  collegeId: string;
}

export interface ViewerMembership {
  role: MembershipRole;
  status: MembershipStatus;
}

export interface ClubDto {
  id: string;
  name: string;
  slug: string;
  category: ClubCategory;
  description: string | null;
  logoUrl: string | null;
  type: ClubType;
  status: ClubStatus;
  memberCount: number;
  viewer: ViewerMembership | null;
}

export interface ClubMemberDto {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  role: MembershipRole;
  status: MembershipStatus;
  requestedAt: Date;
}

export interface ClubDetailDto extends ClubDto {
  leader: Pick<ClubMemberDto, "userId" | "fullName" | "avatarUrl"> | null;
}

function clubs() {
  return AppDataSource.getRepository(Club);
}

function memberships() {
  return AppDataSource.getRepository(ClubMembership);
}

function toClubDto(
  club: Club,
  memberCount: number,
  viewer: ViewerMembership | null,
): ClubDto {
  return {
    id: club.id,
    name: club.name,
    slug: club.slug,
    category: club.category,
    description: club.description,
    logoUrl: publicUrl(club.logoKey),
    type: club.type,
    status: club.status,
    memberCount,
    viewer,
  };
}

function toViewer(membership: ClubMembership | null): ViewerMembership | null {
  return membership
    ? { role: membership.role, status: membership.status }
    : null;
}

async function loadClub(collegeId: string, slug: string): Promise<Club> {
  const club = await clubs().findOneBy({ collegeId, slug });

  if (!club) {
    throw new NotFoundError("Club not found");
  }

  return club;
}

function findMembership(
  clubId: string,
  studentId: string,
): Promise<ClubMembership | null> {
  return memberships().findOneBy({ clubId, studentId });
}

async function countApprovedMembers(clubId: string): Promise<number> {
  return memberships().countBy({ clubId, status: "approved" });
}

async function requireLeader(
  clubId: string,
  userId: string,
): Promise<ClubMembership> {
  const membership = await memberships().findOneBy({
    clubId,
    studentId: userId,
    role: "leader",
    status: "approved",
  });

  if (!membership) {
    throw new ForbiddenError("Only the club leader can do this");
  }

  return membership;
}

async function loadLeader(
  clubId: string,
): Promise<ClubDetailDto["leader"] | null> {
  const row = await memberships()
    .createQueryBuilder("membership")
    .innerJoin(User, "user", "user.id = membership.studentId")
    .select("user.id", "userId")
    .addSelect("user.fullName", "fullName")
    .addSelect("user.avatarKey", "avatarKey")
    .where("membership.club_id = :clubId", { clubId })
    .andWhere("membership.role = :role", { role: "leader" })
    .andWhere("membership.status = :status", { status: "approved" })
    .getRawOne<{
      userId: string;
      fullName: string;
      avatarKey: string | null;
    }>();

  return row
    ? {
        userId: row.userId,
        fullName: row.fullName,
        avatarUrl: publicUrl(row.avatarKey),
      }
    : null;
}

export async function createClub(
  actor: Actor,
  input: CreateClubInput,
): Promise<ClubDto> {
  if (
    await clubs().existsBy({ collegeId: actor.collegeId, slug: input.slug })
  ) {
    throw new ConflictError("A club with this slug already exists");
  }

  const status: ClubStatus = input.type === "official" ? "pending" : "approved";

  const clubId = crypto.randomUUID();

  const logoKey = input.logoUploadId
    ? await attachUpload(
        actor.id,
        "club_logo",
        input.logoUploadId,
        objectKey("clubs", clubId, "logo"),
      )
    : null;

  const club = await AppDataSource.transaction(async (manager) => {
    const club = await manager.save(
      manager.create(Club, {
        id: clubId,
        collegeId: actor.collegeId,
        name: input.name,
        slug: input.slug,
        category: input.category,
        description: input.description ?? null,
        logoKey,
        type: input.type,
        status,
      }),
    );

    await manager.save(
      manager.create(ClubMembership, {
        collegeId: actor.collegeId,
        clubId: club.id,
        studentId: actor.id,
        role: "leader",
        status: "approved",
        decidedAt: new Date(),
      }),
    );

    return club;
  });

  return toClubDto(club, 1, { role: "leader", status: "approved" });
}

export async function listClubs(
  actor: Actor,
  input: ListClubsInput,
): Promise<{ clubs: ClubDto[]; total: number; page: number; limit: number }> {
  const query = clubs()
    .createQueryBuilder("club")
    .where("club.college_id = :collegeId", { collegeId: actor.collegeId });

  if (input.mine) {
    query.innerJoin(
      ClubMembership,
      "mine",
      "mine.club_id = club.id AND mine.student_id = :actorId",
      { actorId: actor.id },
    );
  } else if (actor.role === "campus_admin" && input.status) {
    query.andWhere("club.status = :status", { status: input.status });
  } else {
    query.andWhere("club.status = :approved", { approved: "approved" });
  }

  if (input.search) {
    query.andWhere("club.name ILIKE :search", { search: `%${input.search}%` });
  }

  if (input.category) {
    query.andWhere("club.category = :category", { category: input.category });
  }

  if (input.type) {
    query.andWhere("club.type = :type", { type: input.type });
  }

  const [rows, total] = await query
    .orderBy("club.name", "ASC")
    .skip((input.page - 1) * input.limit)
    .take(input.limit)
    .getManyAndCount();

  const ids = rows.map((club) => club.id);

  const counts = new Map<string, number>();
  const viewers = new Map<string, ViewerMembership>();

  if (ids.length > 0) {
    const countRows = await memberships()
      .createQueryBuilder("membership")
      .select("membership.club_id", "clubId")
      .addSelect("COUNT(*)", "count")
      .where("membership.club_id IN (:...ids)", { ids })
      .andWhere("membership.status = :status", { status: "approved" })
      .groupBy("membership.club_id")
      .getRawMany<{ clubId: string; count: string }>();

    for (const row of countRows) {
      counts.set(row.clubId, Number(row.count));
    }

    const mine = await memberships().findBy({
      clubId: In(ids),
      studentId: actor.id,
    });

    for (const membership of mine) {
      viewers.set(membership.clubId, toViewer(membership)!);
    }
  }

  return {
    clubs: rows.map((club) =>
      toClubDto(club, counts.get(club.id) ?? 0, viewers.get(club.id) ?? null),
    ),
    total,
    page: input.page,
    limit: input.limit,
  };
}

export async function getClub(
  actor: Actor,
  slug: string,
): Promise<ClubDetailDto> {
  const club = await loadClub(actor.collegeId, slug);
  const membership = await findMembership(club.id, actor.id);

  if (
    club.status !== "approved" &&
    !membership &&
    actor.role !== "campus_admin"
  ) {
    throw new NotFoundError("Club not found");
  }

  const [memberCount, leader] = await Promise.all([
    countApprovedMembers(club.id),
    loadLeader(club.id),
  ]);

  return { ...toClubDto(club, memberCount, toViewer(membership)), leader };
}

export async function updateClub(
  actor: Actor,
  slug: string,
  input: UpdateClubInput,
): Promise<ClubDto> {
  const club = await loadClub(actor.collegeId, slug);
  await requireLeader(club.id, actor.id);

  const logoKey = input.logoUploadId
    ? await attachUpload(
        actor.id,
        "club_logo",
        input.logoUploadId,
        objectKey("clubs", club.id, "logo"),
      )
    : null;

  const previousLogoKey = club.logoKey;

  if (input.name !== undefined) {
    club.name = input.name;
  }
  if (input.category !== undefined) {
    club.category = input.category;
  }
  if (input.description !== undefined) {
    club.description = input.description;
  }
  if (logoKey) {
    club.logoKey = logoKey;
  }

  await clubs().save(club);

  if (logoKey) {
    await deleteObjectQuietly(previousLogoKey);
  }

  const memberCount = await countApprovedMembers(club.id);

  return toClubDto(club, memberCount, { role: "leader", status: "approved" });
}

export async function decideClub(
  actor: Actor,
  slug: string,
  status: "approved" | "rejected",
): Promise<ClubDto> {
  const club = await loadClub(actor.collegeId, slug);

  if (club.type !== "official") {
    throw new ConflictError("Only official clubs are reviewed");
  }

  if (club.status !== "pending") {
    throw new ConflictError("This request has already been decided");
  }

  club.status = status;
  await clubs().save(club);

  const memberCount = await countApprovedMembers(club.id);

  return toClubDto(club, memberCount, null);
}

export async function transferLeader(
  actor: Actor,
  slug: string,
  targetUserId: string,
): Promise<ClubDetailDto> {
  const club = await loadClub(actor.collegeId, slug);

  const isAdminTransfer =
    actor.role === "campus_admin" && club.type === "official";

  if (!isAdminTransfer) {
    await requireLeader(club.id, actor.id);
  }

  const current = await memberships().findOneBy({
    clubId: club.id,
    role: "leader",
    status: "approved",
  });

  if (current?.studentId !== targetUserId) {
    const target = await findMembership(club.id, targetUserId);

    if (!target || target.status !== "approved") {
      throw new ValidationError("Invalid input", [
        {
          field: "userId",
          message: "The new leader must already be a member of this club",
        },
      ]);
    }

    await AppDataSource.transaction(async (manager) => {
      if (current) {
        await manager.update(
          ClubMembership,
          { id: current.id },
          { role: "member" },
        );
      }

      await manager.update(
        ClubMembership,
        { id: target.id },
        { role: "leader", decidedAt: target.decidedAt ?? new Date() },
      );
    });
  }

  return getClub(actor, slug);
}

export async function joinClub(
  actor: Actor,
  slug: string,
): Promise<ViewerMembership> {
  const club = await loadClub(actor.collegeId, slug);

  if (club.status !== "approved") {
    throw new NotFoundError("Club not found");
  }

  const existing = await findMembership(club.id, actor.id);

  if (existing) {
    if (existing.status !== "rejected") {
      throw new ConflictError("You have already applied to this club");
    }

    existing.status = "pending";
    existing.decidedAt = null;
    await memberships().save(existing);

    return toViewer(existing)!;
  }

  const membership = await memberships().save(
    memberships().create({
      collegeId: actor.collegeId,
      clubId: club.id,
      studentId: actor.id,
      role: "member",
      status: "pending",
    }),
  );

  return toViewer(membership)!;
}

export async function listMembers(
  actor: Actor,
  slug: string,
): Promise<ClubMemberDto[]> {
  const club = await loadClub(actor.collegeId, slug);
  const membership = await findMembership(club.id, actor.id);

  const isAdminViewer =
    actor.role === "campus_admin" && club.type === "official";
  const isMember = membership?.status === "approved";

  if (!isMember && !isAdminViewer) {
    throw new ForbiddenError("Join this club to see its members");
  }

  const isLeader = membership?.role === "leader" && isMember;

  const query = memberships()
    .createQueryBuilder("membership")
    .innerJoin(User, "user", "user.id = membership.studentId")
    .select("user.id", "userId")
    .addSelect("user.fullName", "fullName")
    .addSelect("user.avatarKey", "avatarKey")
    .addSelect("membership.role", "role")
    .addSelect("membership.status", "status")
    .addSelect("membership.requested_at", "requestedAt")
    .where("membership.club_id = :clubId", { clubId: club.id });

  if (isLeader || isAdminViewer) {
    query.andWhere("membership.status IN (:...statuses)", {
      statuses: ["approved", "pending"],
    });
  } else {
    query.andWhere("membership.status = :status", { status: "approved" });
  }

  const rows = await query
    .orderBy("membership.status", "ASC")
    .addOrderBy("user.full_name", "ASC")
    .getRawMany<{
      userId: string;
      fullName: string;
      avatarKey: string | null;
      role: MembershipRole;
      status: MembershipStatus;
      requestedAt: Date;
    }>();

  return rows.map((row) => ({
    userId: row.userId,
    fullName: row.fullName,
    avatarUrl: publicUrl(row.avatarKey),
    role: row.role,
    status: row.status,
    requestedAt: row.requestedAt,
  }));
}

export async function decideMembership(
  actor: Actor,
  slug: string,
  targetUserId: string,
  status: "approved" | "rejected",
): Promise<ViewerMembership> {
  const club = await loadClub(actor.collegeId, slug);
  await requireLeader(club.id, actor.id);

  const membership = await findMembership(club.id, targetUserId);

  if (!membership) {
    throw new NotFoundError("This student has not applied to your club");
  }

  if (membership.status !== "pending") {
    throw new ConflictError("This request has already been decided");
  }

  membership.status = status;
  membership.decidedAt = new Date();
  await memberships().save(membership);

  return toViewer(membership)!;
}

export async function removeMember(
  actor: Actor,
  slug: string,
  targetUserId: string,
): Promise<void> {
  const club = await loadClub(actor.collegeId, slug);

  if (targetUserId !== actor.id) {
    await requireLeader(club.id, actor.id);
  }

  const membership = await findMembership(club.id, targetUserId);

  if (!membership) {
    throw new NotFoundError("This student is not part of your club");
  }

  if (membership.role === "leader" && membership.status === "approved") {
    throw new ConflictError("Transfer leadership before leaving this club");
  }

  await memberships().delete({ id: membership.id });
}
