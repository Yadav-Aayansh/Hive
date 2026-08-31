import crypto from "node:crypto";
import { logger } from "../config/logger";
import { redis } from "../config/redis";
import { ServiceUnavailableError } from "./AppError";

const TTL_SECONDS = 30 * 60;

const key = (token: string) =>
  `reset:${crypto.createHash("sha256").update(token).digest("hex")}`;

export async function createResetToken(userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("base64url");

  try {
    await redis.set(key(token), userId, "EX", TTL_SECONDS);
  } catch (err) {
    logger.error({ err }, "Redis unreachable while issuing a reset token");
    throw new ServiceUnavailableError("Unable to start a password reset");
  }

  return token;
}

export async function consumeResetToken(token: string): Promise<string | null> {
  try {
    return await redis.getdel(key(token));
  } catch (err) {
    logger.error({ err }, "Redis unreachable while consuming a reset token");
    throw new ServiceUnavailableError("Unable to verify this reset link");
  }
}
