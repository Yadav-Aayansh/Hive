import { AppDataSource } from "../../config/data-source";
import { College } from "../../entity/College";
import { User } from "../../entity/User";
import {
  ConflictError,
  UnauthenticatedError,
  ValidationError,
} from "../../utils/AppError";
import { domainOf } from "../../utils/email";
import type { IssuedToken } from "../../utils/jwt";
import { startSession } from "../auth/auth.service";
import type { OnboardingInput } from "./college.schema";

export interface CollegeDto {
  id: string;
  name: string;
  slug: string;
  domain: string;
  description: string | null;
  status: College["status"];
}

function toCollegeDto(college: College): CollegeDto {
  return {
    id: college.id,
    name: college.name,
    slug: college.slug,
    domain: college.domain,
    description: college.description,
    status: college.status,
  };
}

export async function onboardCollege(
  userId: string,
  input: OnboardingInput,
): Promise<{ college: CollegeDto; issued: IssuedToken }> {
  const users = AppDataSource.getRepository(User);
  const colleges = AppDataSource.getRepository(College);

  const user = await users.findOneBy({ id: userId });

  if (!user) {
    throw new UnauthenticatedError("Account no longer exists");
  }

  if (user.collegeId) {
    throw new ConflictError("This account has already onboarded a college");
  }

  if (domainOf(user.email) !== input.domain) {
    throw new ValidationError("Invalid input", [
      {
        field: "domain",
        message: "Must match the domain of your own email address",
      },
    ]);
  }

  if (await colleges.existsBy({ domain: input.domain })) {
    throw new ConflictError("A college with this domain is already registered");
  }

  if (await colleges.existsBy({ slug: input.slug })) {
    throw new ConflictError("This slug is taken");
  }

  const college = await AppDataSource.transaction(async (manager) => {
    const college = await manager.save(
      manager.create(College, {
        name: input.name,
        slug: input.slug,
        domain: input.domain,
        description: input.description ?? null,
        status: "verified",
      }),
    );

    await manager.update(User, { id: user.id }, { collegeId: college.id });

    return college;
  });

  user.collegeId = college.id;
  const issued = await startSession(user);

  return { college: toCollegeDto(college), issued };
}
