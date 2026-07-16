import type { Request, Response } from "express";
import { setAuthCookie } from "../../utils/cookie";
import { sendSuccess } from "../../utils/response";
import type { OnboardingInput } from "./college.schema";
import * as collegeService from "./college.service";

export async function onboard(req: Request, res: Response) {
  const { college, issued } = await collegeService.onboardCollege(
    req.user!.id,
    req.body as OnboardingInput,
  );
  setAuthCookie(res, issued.token);
  return sendSuccess(res, { college }, 201);
}
