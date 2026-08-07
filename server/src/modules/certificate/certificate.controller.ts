import type { Request, Response } from "express";
import { sendSuccess } from "../../utils/response";
import type {
  CertificateParams,
  ListCertificatesInput,
} from "./certificate.schema";
import * as certificateService from "./certificate.service";

function actor(req: Request): certificateService.Actor {
  return {
    id: req.user!.id,
    role: req.user!.role,
    collegeId: req.user!.collegeId!,
  };
}

export async function list(req: Request, res: Response) {
  const result = await certificateService.listCertificates(
    actor(req),
    req.query as unknown as ListCertificatesInput,
  );
  return sendSuccess(res, result);
}

export async function verify(req: Request, res: Response) {
  const { serial } = req.params as unknown as CertificateParams;

  const certificate = await certificateService.verifyCertificate(serial);
  return sendSuccess(res, { certificate });
}
