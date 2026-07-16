import type { Request, Response } from "express";
import { clearAuthCookie, setAuthCookie } from "../../utils/cookie";
import { sendSuccess } from "../../utils/response";
import type { LoginInput, SignupInput } from "./auth.schema";
import * as authService from "./auth.service";

export async function signup(req: Request, res: Response) {
  const { user, issued } = await authService.signup(req.body as SignupInput);
  setAuthCookie(res, issued.token);
  return sendSuccess(res, { user }, 201);
}

export async function login(req: Request, res: Response) {
  const { user, issued } = await authService.login(req.body as LoginInput);
  setAuthCookie(res, issued.token);
  return sendSuccess(res, { user });
}

export async function logout(req: Request, res: Response) {
  await authService.logout(req.user!.id, req.user!.jti);
  clearAuthCookie(res);
  return sendSuccess(res, { message: "Signed out" });
}

export async function me(req: Request, res: Response) {
  const user = await authService.getCurrentUser(req.user!.id);
  return sendSuccess(res, { user });
}
