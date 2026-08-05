import { Router } from "express";
import {
  authenticate,
  requireOnboarded,
  requireRole,
} from "../../middlewares/auth";
import { validate } from "../../middlewares/validate";
import * as announcementController from "./announcement.controller";
import {
  announcementParamsSchema,
  createAnnouncementSchema,
  listAnnouncementsSchema,
  updateAnnouncementSchema,
} from "./announcement.schema";

export const announcementRouter = Router();

announcementRouter.post(
  "/",
  authenticate,
  requireRole("student"),
  validate(createAnnouncementSchema),
  announcementController.create,
);

announcementRouter.get(
  "/",
  authenticate,
  requireOnboarded,
  validate(listAnnouncementsSchema, "query"),
  announcementController.list,
);

announcementRouter.patch(
  "/:id",
  authenticate,
  requireRole("student"),
  validate(announcementParamsSchema, "params"),
  validate(updateAnnouncementSchema),
  announcementController.update,
);

announcementRouter.delete(
  "/:id",
  authenticate,
  requireRole("student"),
  validate(announcementParamsSchema, "params"),
  announcementController.remove,
);
