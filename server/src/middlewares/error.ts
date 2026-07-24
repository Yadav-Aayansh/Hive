import type { NextFunction, Request, Response } from "express";
import { MulterError } from "multer";
import { logger } from "../config/logger";
import { AppError } from "../utils/AppError";
import { sendError } from "../utils/response";

export function notFoundHandler(req: Request, res: Response) {
  return sendError(
    res,
    404,
    "NOT_FOUND",
    `Cannot ${req.method} ${req.originalUrl}`,
  );
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error({ err }, err.message);
    }
    return sendError(res, err.statusCode, err.code, err.message, err.details);
  }

  if (err instanceof MulterError) {
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "File must be 5MB or smaller"
        : "Invalid file upload";

    return sendError(res, 400, "VALIDATION_ERROR", message, [
      { field: err.field ?? "file", message },
    ]);
  }

  logger.error({ err }, "Unhandled error");
  return sendError(res, 500, "INTERNAL", "Something went wrong");
}
