import { Router } from "express";
import {
  authenticate,
  requireOnboarded,
  requireRole,
} from "../../middlewares/auth";
import { validate } from "../../middlewares/validate";
import * as clubController from "./club.controller";
import {
  createClubSchema,
  decideClubSchema,
  decideMembershipSchema,
  listClubsSchema,
  memberParamsSchema,
  transferLeaderSchema,
  updateClubSchema,
} from "./club.schema";

export const clubRouter = Router();

clubRouter.post(
  "/",
  authenticate,
  requireRole("student"),
  validate(createClubSchema),
  clubController.create,
);

clubRouter.get(
  "/",
  authenticate,
  requireOnboarded,
  validate(listClubsSchema, "query"),
  clubController.list,
);

clubRouter.get("/:slug", authenticate, requireOnboarded, clubController.detail);

clubRouter.patch(
  "/:slug",
  authenticate,
  requireRole("student"),
  validate(updateClubSchema),
  clubController.update,
);

clubRouter.patch(
  "/:slug/status",
  authenticate,
  requireRole("campus_admin"),
  requireOnboarded,
  validate(decideClubSchema),
  clubController.decide,
);

clubRouter.put(
  "/:slug/leader",
  authenticate,
  requireOnboarded,
  validate(transferLeaderSchema),
  clubController.transferLeader,
);

clubRouter.post(
  "/:slug/members",
  authenticate,
  requireRole("student"),
  clubController.join,
);

clubRouter.get(
  "/:slug/members",
  authenticate,
  requireOnboarded,
  clubController.members,
);

clubRouter.patch(
  "/:slug/members/:userId",
  authenticate,
  requireRole("student"),
  validate(memberParamsSchema, "params"),
  validate(decideMembershipSchema),
  clubController.decideMember,
);

clubRouter.delete(
  "/:slug/members/:userId",
  authenticate,
  requireRole("student"),
  validate(memberParamsSchema, "params"),
  clubController.removeMember,
);
