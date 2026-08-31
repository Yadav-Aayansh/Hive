import crypto from "node:crypto";
import { AppDataSource } from "../../config/data-source";
import { env } from "../../config/env";
import { Certificate } from "../../entity/Certificate";
import { Club } from "../../entity/Club";
import {
  College,
  PLAN_LIMITS,
  type CollegePlan,
} from "../../entity/College";
import { Event } from "../../entity/Event";
import { User } from "../../entity/User";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthenticatedError,
  ValidationError,
} from "../../utils/AppError";
import { cacheKeys, drop, remember } from "../../utils/cache";
import { domainOf } from "../../utils/email";
import type { IssuedToken } from "../../utils/jwt";
import { createOrder, verifySignature } from "../../utils/razorpay";
import { deleteObjectQuietly, objectKey, publicUrl } from "../../utils/storage";
import { startSession } from "../auth/auth.service";
import { attachUpload } from "../upload/upload.service";
import type {
  ConfirmCheckoutInput,
  OnboardingInput,
  UpdateCollegeInput,
} from "./college.schema";

const PRO_PLAN_AMOUNT = 499900;

const COLLEGE_TTL_SECONDS = 300;

const STATS_TTL_SECONDS = 120;

export interface CollegeDto {
  id: string;
  name: string;
  slug: string;
  domain: string;
  description: string | null;
  logoUrl: string | null;
  status: College["status"];
  plan: CollegePlan;
}

function toCollegeDto(college: College): CollegeDto {
  return {
    id: college.id,
    name: college.name,
    slug: college.slug,
    domain: college.domain,
    description: college.description,
    logoUrl: publicUrl(college.logoKey),
    status: college.status,
    plan: college.plan,
  };
}

export interface PublicCollegeDto {
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
}

function toPublicCollegeDto(college: College): PublicCollegeDto {
  return {
    name: college.name,
    slug: college.slug,
    description: college.description,
    logoUrl: publicUrl(college.logoKey),
  };
}

export async function getCollege(slug: string): Promise<PublicCollegeDto> {
  return remember(cacheKeys.college(slug), COLLEGE_TTL_SECONDS, async () => {
    const college = await AppDataSource.getRepository(College).findOneBy({
      slug,
    });

    if (!college) {
      throw new NotFoundError("College not found");
    }

    return toPublicCollegeDto(college);
  });
}

export interface CollegePlanDto {
  name: CollegePlan;
  clubLimit: number | null;
  eventLimit: number | null;
}

export interface CollegeStatsDto {
  clubs: { total: number; pending: number };
  events: { total: number; published: number };
  members: number;
  certificates: number;
  plan: CollegePlanDto;
}

async function loadCollege(collegeId: string): Promise<College> {
  const college = await AppDataSource.getRepository(College).findOneBy({
    id: collegeId,
  });

  if (!college) {
    throw new UnauthenticatedError("Account no longer exists");
  }

  return college;
}

function toPlanDto(plan: CollegePlan): CollegePlanDto {
  return {
    name: plan,
    clubLimit: PLAN_LIMITS[plan].clubs,
    eventLimit: PLAN_LIMITS[plan].events,
  };
}

export async function getCollegeStats(
  collegeId: string,
): Promise<CollegeStatsDto> {
  return remember(
    cacheKeys.collegeStats(collegeId),
    STATS_TTL_SECONDS,
    async () => {
      const clubs = AppDataSource.getRepository(Club);
      const events = AppDataSource.getRepository(Event);

      const [
        clubTotal,
        clubPending,
        eventTotal,
        eventPublished,
        members,
        certificates,
        college,
      ] = await Promise.all([
        clubs.countBy({ collegeId }),
        clubs.countBy({ collegeId, status: "pending" }),
        events.countBy({ collegeId }),
        events.countBy({ collegeId, status: "published" }),
        AppDataSource.getRepository(User).countBy({
          collegeId,
          role: "student",
        }),
        AppDataSource.getRepository(Certificate).countBy({ collegeId }),
        loadCollege(collegeId),
      ]);

      return {
        clubs: { total: clubTotal, pending: clubPending },
        events: { total: eventTotal, published: eventPublished },
        members,
        certificates,
        plan: toPlanDto(college.plan),
      };
    },
  );
}

export async function assertPlanCapacity(
  collegeId: string,
  resource: "clubs" | "events",
): Promise<void> {
  const college = await loadCollege(collegeId);
  const limit = PLAN_LIMITS[college.plan][resource];

  if (limit === null) {
    return;
  }

  const repository =
    resource === "clubs"
      ? AppDataSource.getRepository(Club)
      : AppDataSource.getRepository(Event);

  if ((await repository.countBy({ collegeId })) >= limit) {
    throw new ConflictError(
      resource === "clubs"
        ? "Your college has reached its club limit, ask your campus admin to upgrade"
        : "Your college has reached its event limit, ask your campus admin to upgrade",
    );
  }
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

  const collegeId = crypto.randomUUID();
  const logoKey = input.logoUploadId
    ? await attachUpload(
        userId,
        "college_logo",
        input.logoUploadId,
        objectKey("colleges", collegeId, "logo"),
      )
    : null;

  const college = await AppDataSource.transaction(async (manager) => {
    const college = await manager.save(
      manager.create(College, {
        id: collegeId,
        name: input.name,
        slug: input.slug,
        domain: input.domain,
        description: input.description ?? null,
        logoKey,
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

export async function updateCollege(
  userId: string,
  collegeId: string,
  slug: string,
  input: UpdateCollegeInput,
): Promise<CollegeDto> {
  const colleges = AppDataSource.getRepository(College);
  const college = await colleges.findOneBy({ id: collegeId });

  if (!college) {
    throw new UnauthenticatedError("Account no longer exists");
  }

  if (college.slug !== slug) {
    throw new ForbiddenError("You can only update your own college");
  }

  const logoKey = input.logoUploadId
    ? await attachUpload(
        userId,
        "college_logo",
        input.logoUploadId,
        objectKey("colleges", college.id, "logo"),
      )
    : null;

  const previousLogoKey = college.logoKey;

  if (input.name !== undefined) {
    college.name = input.name;
  }
  if (input.description !== undefined) {
    college.description = input.description;
  }
  if (logoKey) {
    college.logoKey = logoKey;
  }

  await colleges.save(college);

  await drop(cacheKeys.college(college.slug));

  if (logoKey) {
    await deleteObjectQuietly(previousLogoKey);
  }

  return toCollegeDto(college);
}

export interface CheckoutDto {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
}

export async function startCheckout(collegeId: string): Promise<CheckoutDto> {
  const college = await loadCollege(collegeId);

  if (college.plan === "pro") {
    throw new ConflictError("Your college is already on the Pro plan");
  }

  const order = await createOrder(PRO_PLAN_AMOUNT);

  await AppDataSource.getRepository(College).update(
    { id: college.id },
    { pendingOrderId: order.id },
  );

  return {
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId: env.RAZORPAY_KEY_ID,
  };
}

export async function confirmCheckout(
  collegeId: string,
  input: ConfirmCheckoutInput,
): Promise<CollegeDto> {
  const colleges = AppDataSource.getRepository(College);
  const college = await loadCollege(collegeId);

  if (college.plan === "pro") {
    throw new ConflictError("Your college is already on the Pro plan");
  }

  if (college.pendingOrderId !== input.orderId) {
    throw new ValidationError("Invalid input", [
      {
        field: "orderId",
        message: "This order was not issued for your college",
      },
    ]);
  }

  if (!verifySignature(input.orderId, input.paymentId, input.signature)) {
    throw new ValidationError("Invalid input", [
      { field: "signature", message: "This payment could not be verified" },
    ]);
  }

  college.plan = "pro";
  college.planPaidAt = new Date();
  college.pendingOrderId = null;

  await colleges.save(college);

  await drop(cacheKeys.collegeStats(college.id));

  return toCollegeDto(college);
}
