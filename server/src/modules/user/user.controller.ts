import type { Request, Response } from "express";
import { sendSuccess } from "../../utils/response";
import type { UpdateProfileInput } from "./user.schema";
import * as userService from "./user.service";

export async function me(req: Request, res: Response) {
  const user = await userService.getProfile(req.user!.id);
  return sendSuccess(res, { user });
}

export async function updateMe(req: Request, res: Response) {
  const user = await userService.updateProfile(
    req.user!.id,
    req.body as UpdateProfileInput,
  );
  return sendSuccess(res, { user });
}
