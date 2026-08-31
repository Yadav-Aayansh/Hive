import type { Request, Response } from "express";
import { setAuthCookie } from "../../utils/cookie";
import { sendSuccess } from "../../utils/response";
import type {
  CollegeParams,
  ConfirmCheckoutInput,
  OnboardingInput,
  UpdateCollegeInput,
} from "./college.schema";
import * as collegeService from "./college.service";

export async function onboard(req: Request, res: Response) {
  const { college, issued } = await collegeService.onboardCollege(
    req.user!.id,
    req.body as OnboardingInput,
  );
  setAuthCookie(res, issued.token);
  return sendSuccess(res, { college }, 201);
}

export async function detail(req: Request, res: Response) {
  const { slug } = req.params as CollegeParams;
  const college = await collegeService.getCollege(slug);
  return sendSuccess(res, { college });
}

export async function stats(req: Request, res: Response) {
  const stats = await collegeService.getCollegeStats(req.user!.collegeId!);
  return sendSuccess(res, { stats });
}

export async function checkout(req: Request, res: Response) {
  const checkout = await collegeService.startCheckout(req.user!.collegeId!);
  return sendSuccess(res, { checkout }, 201);
}

export async function confirmCheckout(req: Request, res: Response) {
  const college = await collegeService.confirmCheckout(
    req.user!.collegeId!,
    req.body as ConfirmCheckoutInput,
  );
  return sendSuccess(res, { college });
}

export async function update(req: Request, res: Response) {
  const { slug } = req.params as { slug: string };

  const college = await collegeService.updateCollege(
    req.user!.id,
    req.user!.collegeId!,
    slug,
    req.body as UpdateCollegeInput,
  );
  return sendSuccess(res, { college });
}
