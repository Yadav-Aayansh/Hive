import { Router } from "express";
import { authenticate, requireRole } from "../../middlewares/auth";
import { validate } from "../../middlewares/validate";
import * as certificateController from "./certificate.controller";
import {
  certificateParamsSchema,
  listCertificatesSchema,
} from "./certificate.schema";

export const certificateRouter = Router();

certificateRouter.get(
  "/",
  authenticate,
  requireRole("student"),
  validate(listCertificatesSchema, "query"),
  certificateController.list,
);

certificateRouter.get(
  "/:serial",
  validate(certificateParamsSchema, "params"),
  certificateController.verify,
);
