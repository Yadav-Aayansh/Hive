import { queryOptions } from "@tanstack/react-query";
import { api } from "../api";
import type { CollegePlan } from "../constants";

export interface CollegePlanDto {
  name: CollegePlan;
  clubLimit: number | null;
  eventLimit: number | null;
}

export interface CollegeStatsDto {
  clubs: { total: number; pending: number };
  events: { total: number; published: number };
  members: number;
  certificates: number;
  plan: CollegePlanDto;
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
  plan: CollegePlan;
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

export interface CheckoutDto {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
}

export interface ConfirmCheckoutInput {
  orderId: string;
  paymentId: string;
  signature: string;
}

export function startCheckout() {
  return api.post<{ checkout: CheckoutDto }>("/colleges/checkout");
}

export function confirmCheckout(input: ConfirmCheckoutInput) {
  return api.post<{ college: CollegeDto }>("/colleges/checkout/verify", input);
}
