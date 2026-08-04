import type { Request, Response } from "express";
import { sendSuccess } from "../../utils/response";
import type {
  CreateEventInput,
  EventStatusInput,
  ListEventsInput,
  ListRegistrationsInput,
  PublishResultsInput,
  RegistrationParams,
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

export async function register(req: Request, res: Response) {
  const { slug } = req.params as { slug: string };

  const registration = await eventService.registerForEvent(actor(req), slug);
  return sendSuccess(res, { registration }, 201);
}

export async function cancelRegistration(req: Request, res: Response) {
  const { slug } = req.params as { slug: string };

  await eventService.cancelRegistration(actor(req), slug);
  return res.status(204).send();
}

export async function registrations(req: Request, res: Response) {
  const { slug } = req.params as { slug: string };

  const result = await eventService.listRegistrations(
    actor(req),
    slug,
    req.query as unknown as ListRegistrationsInput,
  );
  return sendSuccess(res, result);
}

export async function openCheckin(req: Request, res: Response) {
  const { slug } = req.params as { slug: string };

  const event = await eventService.openCheckin(actor(req), slug);
  return sendSuccess(res, { event });
}

export async function checkIn(req: Request, res: Response) {
  const { slug, userId } = req.params as unknown as RegistrationParams;

  const registration = await eventService.checkInRegistration(
    actor(req),
    slug,
    userId,
  );
  return sendSuccess(res, { registration });
}

export async function publishResults(req: Request, res: Response) {
  const { slug } = req.params as { slug: string };

  const event = await eventService.publishResults(
    actor(req),
    slug,
    req.body as PublishResultsInput,
  );
  return sendSuccess(res, { event });
}
