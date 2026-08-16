import { queryOptions } from "@tanstack/react-query";
import { api } from "../api";

export interface CollegeStatsDto {
  clubs: { total: number; pending: number };
  events: { total: number; published: number };
  members: number;
  certificates: number;
}

export const collegeStatsQueryOptions = queryOptions({
  queryKey: ["colleges", "stats"] as const,
  queryFn: ({ signal }) =>
    api.get<{ stats: CollegeStatsDto }>("/colleges/stats", { signal }),
});

export interface CollegeDto {
  id: string;
  name: string;
  slug: string;
  domain: string;
  description: string | null;
  logoUrl: string | null;
  status: "pending" | "verified";
}

export interface PublicCollegeDto {
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
}

export function collegeQueryOptions(slug: string) {
  return queryOptions({
    queryKey: ["colleges", "detail", slug] as const,
    queryFn: ({ signal }) =>
      api
        .get<{ college: PublicCollegeDto }>(`/colleges/${slug}`, { signal })
        .then((data) => data.college),
  });
}

export interface OnboardingInput {
  name: string;
  slug: string;
  domain: string;
  description?: string;
  logoUploadId?: string;
}

export function onboardCollege(input: OnboardingInput) {
  return api.post<{ college: CollegeDto }>("/colleges", input);
}

export interface UpdateCollegeInput {
  name?: string;
  description?: string | null;
  logoUploadId?: string;
}

export function updateCollege(slug: string, input: UpdateCollegeInput) {
  return api.patch<{ college: CollegeDto }>(`/colleges/${slug}`, input);
}
