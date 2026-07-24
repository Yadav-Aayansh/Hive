import crypto from "node:crypto";
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import sharp from "sharp";
import { env } from "../config/env";
import { logger } from "../config/logger";
import { r2 } from "../config/r2";
import { ValidationError } from "./AppError";

const CACHE_CONTROL = "public, max-age=31536000, immutable";

const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp"]);

export function objectKey(
  table: string,
  rowId: string,
  field: string,
  ext = "webp",
): string {
  return `${table}/${rowId}/${field}/${crypto.randomUUID()}.${ext}`;
}

export interface ImageSize {
  width: number;
  height: number;
}

export async function putObject(
  body: Buffer,
  key: string,
  contentType: string,
  contentDisposition?: string,
): Promise<string> {
  await r2.send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: contentType,
      ContentDisposition: contentDisposition,
      CacheControl: CACHE_CONTROL,
    }),
  );

  return key;
}

export async function uploadImage(
  buffer: Buffer,
  key: string,
  size: ImageSize,
): Promise<string> {
  const image = sharp(buffer, { failOn: "error" });
  let format: string | undefined;
  try {
    ({ format } = await image.metadata());
  } catch {
    throw new ValidationError("Invalid image", [
      { field: "file", message: "File is not a readable image" },
    ]);
  }

  if (!format || !ALLOWED_FORMATS.has(format)) {
    throw new ValidationError("Invalid image", [
      { field: "file", message: "Only JPEG, PNG and WebP images are allowed" },
    ]);
  }

  const webp = await image
    .rotate()
    .resize({ ...size, fit: "cover" })
    .webp({ quality: 82 })
    .toBuffer();

  return putObject(webp, key, "image/webp");
}

export async function headObject(key: string): Promise<boolean> {
  try {
    await r2.send(
      new HeadObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key }),
    );
    return true;
  } catch (err) {
    const status = (err as { $metadata?: { httpStatusCode?: number } })
      .$metadata?.httpStatusCode;

    if (status === 404) {
      return false;
    }

    throw err;
  }
}

export async function moveObject(from: string, to: string): Promise<string> {
  await r2.send(
    new CopyObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: to,
      CopySource: `${env.R2_BUCKET_NAME}/${from}`,
    }),
  );

  await deleteObject(from);

  return to;
}

export async function deleteObject(key: string): Promise<void> {
  await r2.send(
    new DeleteObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key }),
  );
}

export async function deleteObjectQuietly(key: string | null): Promise<void> {
  if (!key) {
    return;
  }

  try {
    await deleteObject(key);
  } catch (err) {
    logger.warn({ err, key }, "Failed to delete replaced object");
  }
}

export function publicUrl(key: string | null): string | null {
  return key === null ? null : `${env.R2_PUBLIC_URL}/${key}`;
}
