import type { Request, Response } from "express";
import { ValidationError } from "../../utils/AppError";
import { sendSuccess } from "../../utils/response";
import type { UploadInput } from "./upload.schema";
import * as uploadService from "./upload.service";

export async function create(req: Request, res: Response) {
  if (!req.file) {
    throw new ValidationError("Invalid input", [
      { field: "file", message: "Required" },
    ]);
  }

  const { purpose } = req.body as UploadInput;
  const result = await uploadService.createUpload(
    req.user!.id,
    purpose,
    req.file.buffer,
  );

  return sendSuccess(res, result, 201);
}
