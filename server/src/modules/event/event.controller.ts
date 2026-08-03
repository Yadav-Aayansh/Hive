import type { Request, Response } from "express";
import { sendSuccess } from "../../utils/response";
import type {
  CreateEventInput,
  EventStatusInput,
  ListEventsInput,
  UpdateEventInput,
} from "./event.schema";
import * as eventService from "./event.service";

function actor(req: Request): eventService.Actor {
  return {
    id: req.user!.id,
    role: req.user!.role,
    collegeId: req.user!.collegeId!,
  };
}

export async function create(req: Request, res: Response) {
  const event = await eventService.createEvent(
    actor(req),
    req.body as CreateEventInput,
  );
  return sendSuccess(res, { event }, 201);
}

export async function list(req: Request, res: Response) {
  const result = await eventService.listEvents(
    actor(req),
    req.query as unknown as ListEventsInput,
  );
  return sendSuccess(res, result);
}

export async function detail(req: Request, res: Response) {
  const { slug } = req.params as { slug: string };

  const event = await eventService.getEvent(actor(req), slug);
  return sendSuccess(res, { event });
}

export async function update(req: Request, res: Response) {
  const { slug } = req.params as { slug: string };

  const event = await eventService.updateEvent(
    actor(req),
    slug,
    req.body as UpdateEventInput,
  );
  return sendSuccess(res, { event });
}

export async function setStatus(req: Request, res: Response) {
  const { slug } = req.params as { slug: string };
  const { status } = req.body as EventStatusInput;

  const event = await eventService.setEventStatus(actor(req), slug, status);
  return sendSuccess(res, { event });
}

export async function remove(req: Request, res: Response) {
  const { slug } = req.params as { slug: string };

  await eventService.deleteEvent(actor(req), slug);
  return res.status(204).send();
}
