import crypto from "node:crypto";
import type { EntityManager } from "typeorm";
import { AppDataSource } from "../../config/data-source";
import { env } from "../../config/env";
import { logger } from "../../config/logger";
import { Certificate } from "../../entity/Certificate";
import { Club } from "../../entity/Club";
import { College } from "../../entity/College";
import { Event } from "../../entity/Event";
import {
  EventRegistration,
  type ResultType,
} from "../../entity/EventRegistration";
import { Student } from "../../entity/Student";
import { User, type UserRole } from "../../entity/User";
import { NotFoundError } from "../../utils/AppError";
import { renderCertificate } from "../../utils/certificate";
import {
  getObject,
  objectKey,
  publicUrl,
  putObject,
} from "../../utils/storage";
import type { ListCertificatesInput } from "./certificate.schema";

const SERIAL_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export interface Actor {
  id: string;
  role: UserRole;
  collegeId: string;
}

export interface CertificateDto {
  serial: string;
  result: ResultType;
  issuedAt: Date;
  fileUrl: string | null;
  event: { slug: string; title: string; startsAt: Date | null };
  club: { slug: string; name: string };
}

export interface CertificateVerificationDto {
  serial: string;
  result: ResultType;
  issuedAt: Date;
  fileUrl: string | null;
  recipient: { fullName: string };
  event: { title: string; startsAt: Date | null; venue: string | null };
  club: { name: string };
  college: { name: string };
}

interface VerificationRow {
  id: string;
  serial: string;
  fileKey: string | null;
  issuedAt: Date;
  result: ResultType | null;
  eventTitle: string;
  eventStartsAt: Date | null;
  eventVenue: string | null;
  clubName: string;
  fullName: string;
  rollNo: string | null;
  branch: string | null;
  collegeName: string;
  collegeDomain: string;
  collegeLogoKey: string | null;
}

interface WalletRow {
  id: string;
  serial: string;
  fileKey: string | null;
  issuedAt: Date;
  result: ResultType | null;
  eventSlug: string;
  eventTitle: string;
  eventStartsAt: Date | null;
  clubSlug: string;
  clubName: string;
}

function certificates() {
  return AppDataSource.getRepository(Certificate);
}

function newSerial(): string {
  let suffix = "";

  for (const byte of crypto.randomBytes(14)) {
    suffix += SERIAL_ALPHABET[byte % SERIAL_ALPHABET.length];
  }

  return `HIVE-${new Date().getFullYear()}-${suffix}`;
}

function verifyUrl(serial: string): string {
  return `${env.APP_URL}/verify/${serial}`;
}

function resultOf(result: ResultType | null): ResultType {
  return result ?? "participant";
}

async function ensureFile(row: VerificationRow): Promise<string | null> {
  if (row.fileKey) {
    return row.fileKey;
  }

  try {
    const logo = row.collegeLogoKey
      ? await getObject(row.collegeLogoKey)
      : null;

    const pdf = await renderCertificate({
      serial: row.serial,
      result: resultOf(row.result),
      issuedAt: row.issuedAt,
      recipientName: row.fullName,
      rollNo: row.rollNo,
      branch: row.branch,
      eventTitle: row.eventTitle,
      eventDate: row.eventStartsAt,
      venue: row.eventVenue,
      clubName: row.clubName,
      collegeName: row.collegeName,
      collegeDomain: row.collegeDomain,
      logo,
      verifyUrl: verifyUrl(row.serial),
    });

    const key = await putObject(
      pdf,
      objectKey("certificates", row.id, "file", "pdf"),
      "application/pdf",
      `attachment; filename="${row.serial}.pdf"`,
    );

    await certificates().update({ id: row.id }, { fileKey: key });

    return key;
  } catch (err) {
    logger.warn({ err, serial: row.serial }, "Failed to render certificate");

    return null;
  }
}

export async function mintCertificates(
  manager: EntityManager,
  event: Event,
): Promise<void> {
  const attendees = await manager.find(EventRegistration, {
    where: {
      collegeId: event.collegeId,
      eventId: event.id,
      status: "checked_in",
    },
    select: { id: true },
  });

  if (attendees.length === 0) {
    return;
  }

  await manager.save(
    attendees.map((registration) =>
      manager.create(Certificate, {
        collegeId: event.collegeId,
        registrationId: registration.id,
        serial: newSerial(),
        fileKey: null,
      }),
    ),
  );
}

export async function listCertificates(
  actor: Actor,
  input: ListCertificatesInput,
): Promise<{
  certificates: CertificateDto[];
  total: number;
  page: number;
  limit: number;
}> {
  const query = certificates()
    .createQueryBuilder("certificate")
    .innerJoin(
      EventRegistration,
      "registration",
      "registration.id = certificate.registrationId",
    )
    .innerJoin(Event, "event", "event.id = registration.eventId")
    .innerJoin(Club, "club", "club.id = event.clubId")
    .where("certificate.college_id = :collegeId", {
      collegeId: actor.collegeId,
    })
    .andWhere("registration.student_id = :studentId", { studentId: actor.id });

  const total = await query.getCount();

  const rows = await query
    .select("certificate.id", "id")
    .addSelect("certificate.serial", "serial")
    .addSelect("certificate.fileKey", "fileKey")
    .addSelect("certificate.issuedAt", "issuedAt")
    .addSelect("registration.result", "result")
    .addSelect("event.slug", "eventSlug")
    .addSelect("event.title", "eventTitle")
    .addSelect("event.startsAt", "eventStartsAt")
    .addSelect("club.slug", "clubSlug")
    .addSelect("club.name", "clubName")
    .orderBy("certificate.issued_at", "DESC")
    .offset((input.page - 1) * input.limit)
    .limit(input.limit)
    .getRawMany<WalletRow>();

  return {
    certificates: rows.map((row) => ({
      serial: row.serial,
      result: resultOf(row.result),
      issuedAt: row.issuedAt,
      fileUrl: publicUrl(row.fileKey),
      event: {
        slug: row.eventSlug,
        title: row.eventTitle,
        startsAt: row.eventStartsAt,
      },
      club: { slug: row.clubSlug, name: row.clubName },
    })),
    total,
    page: input.page,
    limit: input.limit,
  };
}

export async function verifyCertificate(
  serial: string,
): Promise<CertificateVerificationDto> {
  const row = await certificates()
    .createQueryBuilder("certificate")
    .innerJoin(
      EventRegistration,
      "registration",
      "registration.id = certificate.registrationId",
    )
    .innerJoin(Event, "event", "event.id = registration.eventId")
    .innerJoin(Club, "club", "club.id = event.clubId")
    .innerJoin(User, "user", "user.id = registration.studentId")
    .innerJoin(Student, "student", "student.user_id = registration.studentId")
    .innerJoin(College, "college", "college.id = certificate.collegeId")
    .where("certificate.serial = :serial", { serial })
    .select("certificate.id", "id")
    .addSelect("certificate.serial", "serial")
    .addSelect("certificate.fileKey", "fileKey")
    .addSelect("certificate.issuedAt", "issuedAt")
    .addSelect("registration.result", "result")
    .addSelect("event.title", "eventTitle")
    .addSelect("event.startsAt", "eventStartsAt")
    .addSelect("event.venue", "eventVenue")
    .addSelect("club.name", "clubName")
    .addSelect("user.fullName", "fullName")
    .addSelect("student.rollNo", "rollNo")
    .addSelect("student.branch", "branch")
    .addSelect("college.name", "collegeName")
    .addSelect("college.domain", "collegeDomain")
    .addSelect("college.logoKey", "collegeLogoKey")
    .getRawOne<VerificationRow>();

  if (!row) {
    throw new NotFoundError("Certificate not found");
  }

  return {
    serial: row.serial,
    result: resultOf(row.result),
    issuedAt: row.issuedAt,
    fileUrl: publicUrl(await ensureFile(row)),
    recipient: { fullName: row.fullName },
    event: {
      title: row.eventTitle,
      startsAt: row.eventStartsAt,
      venue: row.eventVenue,
    },
    club: { name: row.clubName },
    college: { name: row.collegeName },
  };
}
