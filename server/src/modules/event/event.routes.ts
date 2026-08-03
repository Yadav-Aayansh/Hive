import { Router } from "express";
import {
  authenticate,
  requireOnboarded,
  requireRole,
} from "../../middlewares/auth";
import { validate } from "../../middlewares/validate";
import * as eventController from "./event.controller";
import {
  createEventSchema,
  eventStatusSchema,
  listEventsSchema,
  updateEventSchema,
} from "./event.schema";

export const eventRouter = Router();

eventRouter.post(
  "/",
  authenticate,
  requireRole("student"),
  validate(createEventSchema),
  eventController.create,
);

eventRouter.get(
  "/",
  authenticate,
  requireOnboarded,
  validate(listEventsSchema, "query"),
  eventController.list,
);

eventRouter.get(
  "/:slug",
  authenticate,
  requireOnboarded,
  eventController.detail,
);

eventRouter.patch(
  "/:slug",
  authenticate,
  requireRole("student"),
  validate(updateEventSchema),
  eventController.update,
);

eventRouter.patch(
  "/:slug/status",
  authenticate,
  requireRole("student"),
  validate(eventStatusSchema),
  eventController.setStatus,
);

eventRouter.delete(
  "/:slug",
  authenticate,
  requireRole("student"),
  eventController.remove,
);
