import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env";
import type { UserRole } from "../entity/User";
import {
  ForbiddenError,
  OnboardingRequiredError,
  UnauthenticatedError,
} from "../utils/AppError";
import { setAuthCookie } from "../utils/cookie";
import { TOKEN_TTL_SECONDS, shouldRotate, signToken, verifyToken } from "../utils/jwt";
import { createSession, isSessionActive } from "../utils/session";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const token = req.cookies?.[env.COOKIE_NAME] as string | undefined;

  if (!token) {
    throw new UnauthenticatedError();
  }

  const payload = verifyToken(token);

  if (!(await isSessionActive(payload.sub, payload.jti))) {
    throw new UnauthenticatedError("Session has been revoked");
  }

  req.user = {
    id: payload.sub,
    role: payload.role,
    collegeId: payload.collegeId,
    jti: payload.jti,
  };

  if (shouldRotate(payload) && SAFE_METHODS.has(req.method)) {
    const issued = signToken({
      sub: payload.sub,
      role: payload.role,
      collegeId: payload.collegeId,
    });
    await createSession(payload.sub, issued.jti, TOKEN_TTL_SECONDS);
    setAuthCookie(res, issued.token);
    req.user.jti = issued.jti;
  }

  next();
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new UnauthenticatedError();
    }
    if (!roles.includes(req.user.role)) {
      throw new ForbiddenError();
    }
    next();
  };
}

export function requireOnboarded(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  if (!req.user) {
    throw new UnauthenticatedError();
  }
  if (!req.user.collegeId) {
    throw new OnboardingRequiredError();
  }
  next();
}
