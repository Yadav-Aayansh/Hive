import { Router } from "express";
import {
  authenticate,
  requireOnboarded,
  requireRole,
} from "../../middlewares/auth";
import { validate } from "../../middlewares/validate";
import * as eventController from "./event.controller";
import {
  checkInSchema,
  createEventSchema,
  eventStatusSchema,
  listEventsSchema,
  listRegistrationsSchema,
  publishResultsSchema,
  registrationParamsSchema,
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

eventRouter.post(
  "/:slug/registrations",
  authenticate,
  requireRole("student"),
  eventController.register,
);

eventRouter.delete(
  "/:slug/registrations",
  authenticate,
  requireRole("student"),
  eventController.cancelRegistration,
);

eventRouter.get(
  "/:slug/registrations",
  authenticate,
  requireRole("student"),
  validate(listRegistrationsSchema, "query"),
  eventController.registrations,
);

eventRouter.post(
  "/:slug/checkin",
  authenticate,
  requireRole("student"),
  eventController.openCheckin,
);

eventRouter.patch(
  "/:slug/registrations/:userId",
  authenticate,
  requireRole("student"),
  validate(registrationParamsSchema, "params"),
  validate(checkInSchema),
  eventController.checkIn,
);

eventRouter.put(
  "/:slug/results",
  authenticate,
  requireRole("student"),
  validate(publishResultsSchema),
  eventController.publishResults,
);
