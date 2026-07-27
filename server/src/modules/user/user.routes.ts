import { Router } from "express";
import { authenticate } from "../../middlewares/auth";
import { validate } from "../../middlewares/validate";
import * as userController from "./user.controller";
import { updateProfileSchema } from "./user.schema";

export const userRouter = Router();

userRouter.get("/me", authenticate, userController.me);

userRouter.patch(
  "/me",
  authenticate,
  validate(updateProfileSchema),
  userController.updateMe,
);
