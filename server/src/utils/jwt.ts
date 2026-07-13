import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import type { UserRole } from "../entity/User";
import { UnauthenticatedError } from "./AppError";

export const TOKEN_TTL_SECONDS = env.JWT_TTL_DAYS * 24 * 60 * 60;

export interface TokenClaims {
  sub: string;
  role: UserRole;
  collegeId: string | null;
}

export interface TokenPayload extends TokenClaims {
  jti: string;
  iat: number;
  exp: number;
}

export interface IssuedToken {
  token: string;
  jti: string;
  expiresAt: Date;
}

export function signToken(claims: TokenClaims): IssuedToken {
  const jti = crypto.randomUUID();

  const token = jwt.sign({ ...claims, jti }, env.JWT_SECRET, {
    expiresIn: TOKEN_TTL_SECONDS,
  });

  return {
    token,
    jti,
    expiresAt: new Date(Date.now() + TOKEN_TTL_SECONDS * 1000),
  };
}

export function verifyToken(token: string): TokenPayload {
  try {
    return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
  } catch {
    throw new UnauthenticatedError("Invalid or expired session");
  }
}

export function shouldRotate(payload: TokenPayload): boolean {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const lifetime = payload.exp - payload.iat;
  return nowSeconds - payload.iat > lifetime / 2;
}
