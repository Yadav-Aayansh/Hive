import { AppDataSource } from "../../config/data-source";
import { env } from "../../config/env";
import { College } from "../../entity/College";
import { Student } from "../../entity/Student";
import { User } from "../../entity/User";
import {
  ConflictError,
  UnauthenticatedError,
  ValidationError,
} from "../../utils/AppError";
import { domainOf } from "../../utils/email";
import {
  TOKEN_TTL_SECONDS,
  signToken,
  type IssuedToken,
} from "../../utils/jwt";
import { passwordResetMail } from "../../utils/mail-template";
import { sendMail } from "../../utils/mailer";
import { hashPassword, verifyPassword } from "../../utils/password";
import { consumeResetToken, createResetToken } from "../../utils/reset";
import {
  createSession,
  destroyAllSessions,
  destroySession,
} from "../../utils/session";
import { toUserDto, type UserDto } from "../user/user.service";
import type {
  ForgotPasswordInput,
  LoginInput,
  ResetPasswordInput,
  SignupInput,
} from "./auth.schema";

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

  return {
    user: toUserDto(user, student, college),
    issued: await startSession(user),
  };
}

export async function login(
  input: LoginInput,
): Promise<{ user: UserDto; issued: IssuedToken }> {
  const user = await AppDataSource.getRepository(User)
    .createQueryBuilder("user")
    .addSelect("user.passwordHash")
    .leftJoinAndSelect("user.college", "college")
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

  return {
    user: toUserDto(user, student, user.college),
    issued: await startSession(user),
  };
}

export async function logout(userId: string, jti: string): Promise<void> {
  await destroySession(userId, jti);
}

export async function forgotPassword(input: ForgotPasswordInput): Promise<void> {
  const user = await AppDataSource.getRepository(User).findOneBy({
    email: input.email,
  });

  if (!user) {
    return;
  }

  const token = await createResetToken(user.id);
  const link = `${env.APP_URL}/reset-password?token=${token}`;

  await sendMail({
    to: user.email,
    ...passwordResetMail(user.fullName, link),
  });
}

export async function resetPassword(input: ResetPasswordInput): Promise<void> {
  const userId = await consumeResetToken(input.token);
  const users = AppDataSource.getRepository(User);
  const user = userId ? await users.findOneBy({ id: userId }) : null;

  if (!user) {
    throw new ValidationError("Invalid input", [
      {
        field: "token",
        message: "This reset link is invalid or has expired",
      },
    ]);
  }

  const passwordHash = await hashPassword(input.password);

  await users.update({ id: user.id }, { passwordHash });

  await destroyAllSessions(user.id);
}
