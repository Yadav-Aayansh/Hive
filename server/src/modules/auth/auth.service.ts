import { AppDataSource } from "../../config/data-source";
import { College } from "../../entity/College";
import { Student } from "../../entity/Student";
import { User } from "../../entity/User";
import {
  ConflictError,
  UnauthenticatedError,
  ValidationError,
} from "../../utils/AppError";
import { domainOf } from "../../utils/email";
import { TOKEN_TTL_SECONDS, signToken, type IssuedToken } from "../../utils/jwt";
import { hashPassword, verifyPassword } from "../../utils/password";
import { createSession, destroySession } from "../../utils/session";
import type { LoginInput, SignupInput } from "./auth.schema";

export interface UserDto {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  role: User["role"];
  collegeId: string | null;
  onboarded: boolean;
  student: {
    rollNo: string | null;
    branch: string | null;
    bio: string | null;
  } | null;
}

function toUserDto(user: User, student: Student | null = null): UserDto {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    avatarUrl: user.avatarUrl,
    role: user.role,
    collegeId: user.collegeId,
    onboarded: user.collegeId !== null,
    student: student
      ? { rollNo: student.rollNo, branch: student.branch, bio: student.bio }
      : null,
  };
}

export async function startSession(user: User): Promise<IssuedToken> {
  const issued = signToken({
    sub: user.id,
    role: user.role,
    collegeId: user.collegeId,
  });
  await createSession(user.id, issued.jti, TOKEN_TTL_SECONDS);
  return issued;
}

export async function signup(
  input: SignupInput,
): Promise<{ user: UserDto; issued: IssuedToken }> {
  const users = AppDataSource.getRepository(User);

  if (await users.existsBy({ email: input.email })) {
    throw new ConflictError("An account with this email already exists");
  }

  let college: College | null = null;

  if (input.role === "student") {
    college = await AppDataSource.getRepository(College).findOneBy({
      domain: domainOf(input.email),
      status: "verified",
    });

    if (!college) {
      throw new ValidationError("Invalid input", [
        {
          field: "email",
          message: "No college is registered for this email domain",
        },
      ]);
    }
  }

  const passwordHash = await hashPassword(input.password);

  const { user, student } = await AppDataSource.transaction(async (manager) => {
    const user = await manager.save(
      manager.create(User, {
        email: input.email,
        passwordHash,
        fullName: input.fullName,
        role: input.role,
        collegeId: college?.id ?? null,
      }),
    );

    if (input.role !== "student") {
      return { user, student: null };
    }

    const student = await manager.save(
      manager.create(Student, {
        userId: user.id,
        collegeId: college!.id,
      }),
    );

    return { user, student };
  });

  return { user: toUserDto(user, student), issued: await startSession(user) };
}

export async function login(
  input: LoginInput,
): Promise<{ user: UserDto; issued: IssuedToken }> {
  const user = await AppDataSource.getRepository(User)
    .createQueryBuilder("user")
    .addSelect("user.passwordHash")
    .where("user.email = :email", { email: input.email })
    .getOne();

  if (!user) {
    throw new UnauthenticatedError("Invalid email or password");
  }

  if (!(await verifyPassword(input.password, user.passwordHash))) {
    throw new UnauthenticatedError("Invalid email or password");
  }

  const student = await AppDataSource.getRepository(Student).findOneBy({
    userId: user.id,
  });

  return { user: toUserDto(user, student), issued: await startSession(user) };
}

export async function logout(userId: string, jti: string): Promise<void> {
  await destroySession(userId, jti);
}

export async function getCurrentUser(userId: string): Promise<UserDto> {
  const user = await AppDataSource.getRepository(User).findOneBy({ id: userId });

  if (!user) {
    throw new UnauthenticatedError("Account no longer exists");
  }

  const student = await AppDataSource.getRepository(Student).findOneBy({
    userId,
  });

  return toUserDto(user, student);
}
