import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),

  POSTGRES_HOST: z.string().min(1),
  POSTGRES_PORT: z.coerce.number().int().positive(),
  POSTGRES_USER: z.string().min(1),
  POSTGRES_PASSWORD: z.string().min(1),
  POSTGRES_DB: z.string().min(1),

  REDIS_URL: z.string().min(1).default("redis://localhost:6379"),

  JWT_SECRET: z.string().min(32),
  JWT_TTL_DAYS: z.coerce.number().int().positive().default(7),

  COOKIE_NAME: z.string().min(1).default("hive_token"),

  CORS_ORIGIN: z.string().min(1).default("http://localhost:5173"),

  R2_ACCOUNT_ID: z.string().min(1),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_BUCKET_NAME: z.string().min(1),
  R2_PUBLIC_URL: z.url().transform((value) => value.replace(/\/+$/, "")),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const problems = parsed.error.issues
    .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join(", ");

  throw new Error(`Invalid environment configuration: ${problems}`);
}

export const env = parsed.data;

export const isProduction = env.NODE_ENV === "production";
