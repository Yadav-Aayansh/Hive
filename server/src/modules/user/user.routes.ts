import { Router } from "express";
import { authenticate, requireOnboarded } from "../../middlewares/auth";
import { validate } from "../../middlewares/validate";
import * as userController from "./user.controller";
import { updateProfileSchema, userIdParamSchema } from "./user.schema";

export const userRouter = Router();

userRouter.get("/me", authenticate, userController.me);

userRouter.patch(
  "/me",
  authenticate,
  validate(updateProfileSchema),
  userController.updateMe,
);

userRouter.get(
  "/:id",
  authenticate,
  requireOnboarded,
  validate(userIdParamSchema, "params"),
  userController.publicProfile,
);
