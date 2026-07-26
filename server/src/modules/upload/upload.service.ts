import crypto from "node:crypto";
import { ValidationError } from "../../utils/AppError";
import {
  headObject,
  moveObject,
  uploadImage,
  type ImageSize,
} from "../../utils/storage";
import type { UploadPurpose } from "./upload.schema";

const DIMENSIONS: Record<UploadPurpose, ImageSize> = {
  avatar: { width: 256, height: 256 },
  college_logo: { width: 512, height: 512 },
  club_logo: { width: 512, height: 512 },
  event_banner: { width: 1280, height: 720 },
};

function stagingKey(
  userId: string,
  purpose: UploadPurpose,
  uploadId: string,
): string {
  return `staging/${userId}/${purpose}/${uploadId}.webp`;
}

export async function createUpload(
  userId: string,
  purpose: UploadPurpose,
  buffer: Buffer,
): Promise<{ uploadId: string }> {
  const uploadId = crypto.randomUUID();

  await uploadImage(
    buffer,
    stagingKey(userId, purpose, uploadId),
    DIMENSIONS[purpose],
  );

  return { uploadId };
}

export async function attachUpload(
  userId: string,
  purpose: UploadPurpose,
  uploadId: string,
  finalKey: string,
): Promise<string> {
  const from = stagingKey(userId, purpose, uploadId);

  if (!(await headObject(from))) {
    throw new ValidationError("Upload expired", [
      {
        field: "uploadId",
        message: "Upload not found or expired, please upload the file again",
      },
    ]);
  }

  return moveObject(from, finalKey);
}
