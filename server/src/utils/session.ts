import { redis } from "../config/redis";
import { logger } from "../config/logger";
import { ServiceUnavailableError } from "./AppError";

const key = (userId: string, jti: string) => `sess:${userId}:${jti}`;

export async function createSession(
  userId: string,
  jti: string,
  ttlSeconds: number,
): Promise<void> {
  await redis.set(key(userId, jti), "1", "EX", ttlSeconds);
}

export async function isSessionActive(
  userId: string,
  jti: string,
): Promise<boolean> {
  try {
    return (await redis.exists(key(userId, jti))) === 1;
  } catch (err) {
    logger.error({ err }, "Redis unreachable during session check");
    throw new ServiceUnavailableError("Unable to verify session");
  }
}

export async function expireSession(
  userId: string,
  jti: string,
  ttlSeconds: number,
): Promise<void> {
  await redis.expire(key(userId, jti), ttlSeconds);
}

export async function destroySession(
  userId: string,
  jti: string,
): Promise<void> {
  await redis.del(key(userId, jti));
}

export async function destroyAllSessions(userId: string): Promise<void> {
  const stream = redis.scanStream({ match: `sess:${userId}:*`, count: 100 });

  for await (const keys of stream as AsyncIterable<string[]>) {
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
}
