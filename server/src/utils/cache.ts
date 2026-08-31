import { logger } from "../config/logger";
import { redis } from "../config/redis";

export const cacheKeys = {
  collegeStats: (collegeId: string) => `cache:college-stats:${collegeId}`,
  college: (slug: string) => `cache:college:${slug}`,
};

export async function remember<T>(
  key: string,
  ttlSeconds: number,
  load: () => Promise<T>,
): Promise<T> {
  try {
    const hit = await redis.get(key);

    if (hit !== null) {
      return JSON.parse(hit) as T;
    }
  } catch (err) {
    logger.warn({ err, key }, "Cache read failed");
  }

  const value = await load();

  try {
    await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch (err) {
    logger.warn({ err, key }, "Cache write failed");
  }

  return value;
}

export async function drop(...keys: string[]): Promise<void> {
  if (keys.length === 0) {
    return;
  }

  try {
    await redis.del(...keys);
  } catch (err) {
    logger.warn({ err, keys }, "Cache drop failed");
  }
}
