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
  confirmCheckoutSchema,
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

collegeRouter.post(
  "/checkout",
  authenticate,
  requireRole("campus_admin"),
  requireOnboarded,
  collegeController.checkout,
);

collegeRouter.post(
  "/checkout/verify",
  authenticate,
  requireRole("campus_admin"),
  requireOnboarded,
  validate(confirmCheckoutSchema),
  collegeController.confirmCheckout,
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
