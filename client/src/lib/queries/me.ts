import { queryOptions, useQuery } from "@tanstack/react-query";
import { api } from "../api";
import type { StudentBranch, UserRole } from "../constants";

export interface StudentProfile {
  rollNo: string | null;
  branch: StudentBranch | null;
  bio: string | null;
}

export interface UserDto {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  role: UserRole;
  collegeSlug: string | null;
  student: StudentProfile | null;
}

export const meQueryKey = ["me"] as const;

export const meQueryOptions = queryOptions({
  queryKey: meQueryKey,
  queryFn: ({ signal }) =>
    api.get<{ user: UserDto }>("/users/me", { signal }).then((data) => data.user),
  retry: false,
  staleTime: 5 * 60 * 1000,
});

export function useMe(): UserDto {
  const { data } = useQuery(meQueryOptions);
  return data!;
}

export function isOnboarded(user: UserDto): boolean {
  return user.collegeSlug !== null;
}
