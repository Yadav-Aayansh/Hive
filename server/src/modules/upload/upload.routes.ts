import { Router } from "express";
import { authenticate } from "../../middlewares/auth";
import { uploadImageFile } from "../../middlewares/upload";
import { validate } from "../../middlewares/validate";
import * as uploadController from "./upload.controller";
import { uploadSchema } from "./upload.schema";

export const uploadRouter = Router();

uploadRouter.post(
  "/",
  authenticate,
  uploadImageFile.single("file"),
  validate(uploadSchema),
  uploadController.create,
);
