import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { fieldErrorsOf } from "./errors";

export function applyFieldErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
): boolean {
  const details = fieldErrorsOf(error);

  for (const detail of details) {
    setError(detail.field as Path<T>, {
      type: "server",
      message: detail.message,
    });
  }

  return details.length > 0;
}
