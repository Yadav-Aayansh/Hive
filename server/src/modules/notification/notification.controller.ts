import type { Request, Response } from "express";
import { sendSuccess } from "../../utils/response";
import type {
  ListNotificationsInput,
  NotificationParams,
} from "./notification.schema";
import * as notificationService from "./notification.service";

function actor(req: Request): notificationService.Actor {
  return {
    id: req.user!.id,
    role: req.user!.role,
    collegeId: req.user!.collegeId!,
  };
}

export async function list(req: Request, res: Response) {
  const result = await notificationService.listNotifications(
    actor(req),
    req.query as unknown as ListNotificationsInput,
  );
  return sendSuccess(res, result);
}

export async function read(req: Request, res: Response) {
  const { id } = req.params as unknown as NotificationParams;

  const notification = await notificationService.markRead(actor(req), id);
  return sendSuccess(res, { notification });
}

export async function readAll(req: Request, res: Response) {
  const result = await notificationService.markAllRead(actor(req));
  return sendSuccess(res, result);
}
