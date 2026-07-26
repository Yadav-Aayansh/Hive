import multer from "multer";
import { ValidationError } from "../utils/AppError";

const MAX_FILE_BYTES = 5 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export const uploadImageFile = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(
        new ValidationError("Invalid image", [
          {
            field: "file",
            message: "Only JPEG, PNG and WebP images are allowed",
          },
        ]),
      );
      return;
    }

    cb(null, true);
  },
});
