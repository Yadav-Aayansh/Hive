import type { Request, Response } from "express";
import { sendSuccess } from "../../utils/response";
import type {
  AnnouncementParams,
  CreateAnnouncementInput,
  ListAnnouncementsInput,
  UpdateAnnouncementInput,
} from "./announcement.schema";
import * as announcementService from "./announcement.service";

function actor(req: Request): announcementService.Actor {
  return {
    id: req.user!.id,
    role: req.user!.role,
    collegeId: req.user!.collegeId!,
  };
}

export async function create(req: Request, res: Response) {
  const announcement = await announcementService.createAnnouncement(
    actor(req),
    req.body as CreateAnnouncementInput,
  );
  return sendSuccess(res, { announcement }, 201);
}

export async function list(req: Request, res: Response) {
  const result = await announcementService.listAnnouncements(
    actor(req),
    req.query as unknown as ListAnnouncementsInput,
  );
  return sendSuccess(res, result);
}

export async function update(req: Request, res: Response) {
  const { id } = req.params as unknown as AnnouncementParams;

  const announcement = await announcementService.updateAnnouncement(
    actor(req),
    id,
    req.body as UpdateAnnouncementInput,
  );
  return sendSuccess(res, { announcement });
}

export async function remove(req: Request, res: Response) {
  const { id } = req.params as unknown as AnnouncementParams;

  await announcementService.deleteAnnouncement(actor(req), id);
  return res.status(204).send();
}
