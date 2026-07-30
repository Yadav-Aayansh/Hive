import type { NextFunction, Request, Response } from "express";
import { ZodError, type ZodType } from "zod";
import { ValidationError, type FieldError } from "../utils/AppError";

type RequestPart = "body" | "params" | "query";

function toFieldErrors(error: ZodError): FieldError[] {
  return error.issues.map((issue) => ({
    field: issue.path.join(".") || "(root)",
    message: issue.message,
  }));
}

export function validate(schema: ZodType, part: RequestPart = "body") {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[part]);

    if (!result.success) {
      return next(new ValidationError("Invalid input", toFieldErrors(result.error)));
    }

    if (part === "body") {
      req.body = result.data;
    } else {
      Object.defineProperty(req, part, {
        value: result.data,
        configurable: true,
        enumerable: true,
        writable: true,
      });
    }

    return next();
  };
}
