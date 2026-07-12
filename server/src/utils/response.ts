import type { Response } from "express";
import type { ErrorCode, FieldError } from "./AppError";

export interface SuccessBody<T> {
  success: true;
  data: T;
}

export interface ErrorBody {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: FieldError[];
  };
}

export function sendSuccess<T>(res: Response, data: T, statusCode = 200) {
  const body: SuccessBody<T> = { success: true, data };
  return res.status(statusCode).json(body);
}

export function sendError(
  res: Response,
  statusCode: number,
  code: ErrorCode,
  message: string,
  details?: FieldError[],
) {
  const body: ErrorBody = {
    success: false,
    error: { code, message, ...(details?.length ? { details } : {}) },
  };
  return res.status(statusCode).json(body);
}
