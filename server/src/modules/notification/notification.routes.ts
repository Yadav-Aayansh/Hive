import { Router } from "express";
import { authenticate, requireOnboarded } from "../../middlewares/auth";
import { validate } from "../../middlewares/validate";
import * as notificationController from "./notification.controller";
import {
  listNotificationsSchema,
  notificationParamsSchema,
} from "./notification.schema";

export const notificationRouter = Router();

notificationRouter.get(
  "/",
  authenticate,
  requireOnboarded,
  validate(listNotificationsSchema, "query"),
  notificationController.list,
);

notificationRouter.post(
  "/read-all",
  authenticate,
  requireOnboarded,
  notificationController.readAll,
);

notificationRouter.patch(
  "/:id/read",
  authenticate,
  requireOnboarded,
  validate(notificationParamsSchema, "params"),
  notificationController.read,
);
