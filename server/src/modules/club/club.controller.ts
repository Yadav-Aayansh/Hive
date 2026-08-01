import type { Request, Response } from "express";
import { sendSuccess } from "../../utils/response";
import type {
  CreateClubInput,
  DecideClubInput,
  DecideMembershipInput,
  ListClubsInput,
  TransferLeaderInput,
  UpdateClubInput,
} from "./club.schema";
import * as clubService from "./club.service";

function actor(req: Request): clubService.Actor {
  return {
    id: req.user!.id,
    role: req.user!.role,
    collegeId: req.user!.collegeId!,
  };
}

export async function create(req: Request, res: Response) {
  const club = await clubService.createClub(
    actor(req),
    req.body as CreateClubInput,
  );
  return sendSuccess(res, { club }, 201);
}

export async function list(req: Request, res: Response) {
  const result = await clubService.listClubs(
    actor(req),
    req.query as unknown as ListClubsInput,
  );
  return sendSuccess(res, result);
}

export async function detail(req: Request, res: Response) {
  const { slug } = req.params as { slug: string };

  const club = await clubService.getClub(actor(req), slug);
  return sendSuccess(res, { club });
}

export async function update(req: Request, res: Response) {
  const { slug } = req.params as { slug: string };

  const club = await clubService.updateClub(
    actor(req),
    slug,
    req.body as UpdateClubInput,
  );
  return sendSuccess(res, { club });
}

export async function decide(req: Request, res: Response) {
  const { slug } = req.params as { slug: string };
  const { status } = req.body as DecideClubInput;

  const club = await clubService.decideClub(actor(req), slug, status);
  return sendSuccess(res, { club });
}

export async function transferLeader(req: Request, res: Response) {
  const { slug } = req.params as { slug: string };
  const { userId } = req.body as TransferLeaderInput;

  const club = await clubService.transferLeader(actor(req), slug, userId);
  return sendSuccess(res, { club });
}

export async function join(req: Request, res: Response) {
  const { slug } = req.params as { slug: string };

  const membership = await clubService.joinClub(actor(req), slug);
  return sendSuccess(res, { membership }, 201);
}

export async function members(req: Request, res: Response) {
  const { slug } = req.params as { slug: string };

  const members = await clubService.listMembers(actor(req), slug);
  return sendSuccess(res, { members });
}

export async function decideMember(req: Request, res: Response) {
  const { slug, userId } = req.params as { slug: string; userId: string };
  const { status } = req.body as DecideMembershipInput;

  const membership = await clubService.decideMembership(
    actor(req),
    slug,
    userId,
    status,
  );
  return sendSuccess(res, { membership });
}

export async function removeMember(req: Request, res: Response) {
  const { slug, userId } = req.params as { slug: string; userId: string };

  await clubService.removeMember(actor(req), slug, userId);
  return res.status(204).send();
}
