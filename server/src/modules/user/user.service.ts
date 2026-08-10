import { AppDataSource } from "../../config/data-source";
import { College } from "../../entity/College";
import { Student, type StudentBranch } from "../../entity/Student";
import { User } from "../../entity/User";
import {
  ConflictError,
  NotFoundError,
  UnauthenticatedError,
  ValidationError,
} from "../../utils/AppError";
import { deleteObjectQuietly, objectKey, publicUrl } from "../../utils/storage";
import { attachUpload } from "../upload/upload.service";
import type { UpdateProfileInput } from "./user.schema";

const STUDENT_FIELDS = ["rollNo", "branch", "bio"] as const;

export interface PublicUserDto {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  branch: StudentBranch | null;
  bio: string | null;
}

export interface UserDto {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  role: User["role"];
  collegeSlug: string | null;
  student: {
    rollNo: string | null;
    branch: StudentBranch | null;
    bio: string | null;
  } | null;
}

export function toUserDto(
  user: User,
  student: Student | null = null,
  college: College | null = null,
): UserDto {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    avatarUrl: publicUrl(user.avatarKey),
    role: user.role,
    collegeSlug: college?.slug ?? null,
    student: student
      ? { rollNo: student.rollNo, branch: student.branch, bio: student.bio }
      : null,
  };
}

async function loadProfile(
  userId: string,
): Promise<{ user: User; student: Student | null }> {
  const user = await AppDataSource.getRepository(User)
    .createQueryBuilder("user")
    .leftJoinAndSelect("user.college", "college")
    .where("user.id = :id", { id: userId })
    .getOne();

  if (!user) {
    throw new UnauthenticatedError("Account no longer exists");
  }

  const student = await AppDataSource.getRepository(Student).findOneBy({
    userId,
  });

  return { user, student };
}

export async function getProfile(userId: string): Promise<UserDto> {
  const { user, student } = await loadProfile(userId);
  return toUserDto(user, student, user.college);
}

export async function getPublicProfile(
  collegeId: string,
  userId: string,
): Promise<PublicUserDto> {
  const user = await AppDataSource.getRepository(User).findOneBy({
    id: userId,
  });

  if (!user || user.collegeId !== collegeId) {
    throw new NotFoundError("User not found");
  }

  const student = await AppDataSource.getRepository(Student).findOneBy({
    userId,
  });

  return {
    id: user.id,
    fullName: user.fullName,
    avatarUrl: publicUrl(user.avatarKey),
    branch: student?.branch ?? null,
    bio: student?.bio ?? null,
  };
}

export async function updateProfile(
  userId: string,
  input: UpdateProfileInput,
): Promise<UserDto> {
  const { user, student } = await loadProfile(userId);

  const studentFields = STUDENT_FIELDS.filter(
    (field) => input[field] !== undefined,
  );

  if (!student && studentFields.length > 0) {
    throw new ValidationError(
      "Invalid input",
      studentFields.map((field) => ({
        field,
        message: "Only students can set this field",
      })),
    );
  }

  if (student && input.rollNo) {
    const holder = await AppDataSource.getRepository(Student).findOneBy({
      collegeId: student.collegeId,
      rollNo: input.rollNo,
    });

    if (holder && holder.userId !== userId) {
      throw new ConflictError(
        "This roll number is already registered at your college",
      );
    }
  }

  const avatarKey = input.avatarUploadId
    ? await attachUpload(
        userId,
        "avatar",
        input.avatarUploadId,
        objectKey("users", userId, "avatar"),
      )
    : null;

  await AppDataSource.transaction(async (manager) => {
    if (input.fullName !== undefined || avatarKey) {
      await manager.update(
        User,
        { id: userId },
        {
          ...(input.fullName !== undefined && { fullName: input.fullName }),
          ...(avatarKey && { avatarKey }),
        },
      );
    }

    if (studentFields.length > 0) {
      await manager.update(
        Student,
        { userId },
        {
          ...(input.rollNo !== undefined && { rollNo: input.rollNo }),
          ...(input.branch !== undefined && { branch: input.branch }),
          ...(input.bio !== undefined && { bio: input.bio }),
        },
      );
    }
  });

  if (avatarKey) {
    await deleteObjectQuietly(user.avatarKey);
  }

  return getProfile(userId);
}
