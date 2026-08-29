const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = ["image/png", "image/jpeg", "image/webp"];

export function imageProblem(file: File): string | null {
  if (!TYPES.includes(file.type)) {
    return "Pick a PNG, JPEG or WebP image";
  }
  if (file.size > MAX_BYTES) {
    return `That image is ${(file.size / 1024 / 1024).toFixed(1)}MB — the limit is 5MB`;
  }
  return null;
}
