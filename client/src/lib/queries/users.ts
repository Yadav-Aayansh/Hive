import type { StudentBranch } from "../constants";
import { queryOptions } from "@tanstack/react-query";
import { api } from "../api";
import type { UserDto } from "./me";

export interface PublicUserDto {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  branch: StudentBranch | null;
  bio: string | null;
}

export interface UpdateProfileInput {
  fullName?: string;
  avatarUploadId?: string;
  rollNo?: string | null;
  branch?: StudentBranch | null;
  bio?: string | null;
}

export function publicProfileQueryOptions(id: string) {
  return queryOptions({
    queryKey: ["users", "public", id] as const,
    queryFn: ({ signal }) =>
      api.get<{ user: PublicUserDto }>(`/users/${id}`, { signal }),
  });
}

export function updateProfile(input: UpdateProfileInput) {
  return api.patch<{ user: UserDto }>("/users/me", input);
}
