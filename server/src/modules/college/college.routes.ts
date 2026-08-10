import { Router } from "express";
import {
  authenticate,
  requireOnboarded,
  requireRole,
} from "../../middlewares/auth";
import { validate } from "../../middlewares/validate";
import * as collegeController from "./college.controller";
import {
  collegeParamsSchema,
  onboardingSchema,
  updateCollegeSchema,
} from "./college.schema";

export const collegeRouter = Router();

collegeRouter.post(
  "/",
  authenticate,
  requireRole("campus_admin"),
  validate(onboardingSchema),
  collegeController.onboard,
);

collegeRouter.get(
  "/stats",
  authenticate,
  requireRole("campus_admin"),
  requireOnboarded,
  collegeController.stats,
);

collegeRouter.get(
  "/:slug",
  validate(collegeParamsSchema, "params"),
  collegeController.detail,
);

collegeRouter.patch(
  "/:slug",
  authenticate,
  requireRole("campus_admin"),
  requireOnboarded,
  validate(updateCollegeSchema),
  collegeController.update,
);
