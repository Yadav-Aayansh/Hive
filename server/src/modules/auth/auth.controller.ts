import type { Request, Response } from "express";
import { clearAuthCookie, setAuthCookie } from "../../utils/cookie";
import { sendSuccess } from "../../utils/response";
import type {
  ForgotPasswordInput,
  LoginInput,
  ResetPasswordInput,
  SignupInput,
} from "./auth.schema";
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

export async function forgotPassword(req: Request, res: Response) {
  await authService.forgotPassword(req.body as ForgotPasswordInput);
  return sendSuccess(res, {
    message: "If that email is registered, a reset link is on its way",
  });
}

export async function resetPassword(req: Request, res: Response) {
  await authService.resetPassword(req.body as ResetPasswordInput);
  return sendSuccess(res, {
    message: "Password updated, sign in with your new password",
  });
}

export async function logout(req: Request, res: Response) {
  await authService.logout(req.user!.id, req.user!.jti);
  clearAuthCookie(res);
  return sendSuccess(res, { message: "Signed out" });
}
