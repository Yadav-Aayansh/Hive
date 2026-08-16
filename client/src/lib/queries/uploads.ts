import { api } from "../api";
import type { UploadPurpose } from "../constants";

export function uploadFile(
  file: File,
  purpose: UploadPurpose,
): Promise<{ uploadId: string }> {
  const form = new FormData();
  form.append("file", file);
  form.append("purpose", purpose);

  return api.post<{ uploadId: string }>("/uploads", form);
}
