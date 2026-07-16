import { Router } from "express";
import { authenticate, requireRole } from "../../middlewares/auth";
import { validate } from "../../middlewares/validate";
import * as collegeController from "./college.controller";
import { onboardingSchema } from "./college.schema";

export const collegeRouter = Router();

collegeRouter.post(
  "/onboarding",
  authenticate,
  requireRole("campus_admin"),
  validate(onboardingSchema),
  collegeController.onboard,
);
