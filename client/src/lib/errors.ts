export const ERROR_CODES = [
  "VALIDATION_ERROR",
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "ONBOARDING_REQUIRED",
  "NOT_FOUND",
  "CONFLICT",
  "RATE_LIMITED",
  "SERVICE_UNAVAILABLE",
  "INTERNAL",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export interface FieldError {
  field: string;
  message: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: ErrorCode;
  readonly details: FieldError[];
  readonly path: string;

  constructor(
    status: number,
    code: ErrorCode,
    message: string,
    path: string,
    details: FieldError[] = [],
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.path = path;
    this.details = details;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function isErrorCode(value: unknown): value is ErrorCode {
  return (
    typeof value === "string" && (ERROR_CODES as readonly string[]).includes(value)
  );
}

export function fieldErrorsOf(error: unknown): FieldError[] {
  return isApiError(error) && error.code === "VALIDATION_ERROR"
    ? error.details
    : [];
}
