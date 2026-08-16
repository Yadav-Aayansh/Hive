import { api } from "../api";
import type { UserRole } from "../constants";
import type { UserDto } from "./me";

export interface LoginInput {
  email: string;
  password: string;
}

export interface SignupInput extends LoginInput {
  fullName: string;
  role: UserRole;
}

export function login(input: LoginInput): Promise<{ user: UserDto }> {
  return api.post<{ user: UserDto }>("/auth/login", input);
}

export function signup(input: SignupInput): Promise<{ user: UserDto }> {
  return api.post<{ user: UserDto }>("/auth/signup", input);
}

export function logout(): Promise<{ message: string }> {
  return api.post<{ message: string }>("/auth/logout");
}
