import { queryOptions } from "@tanstack/react-query";
import { api } from "../api";
import type {
  EventCategory,
  EventStatus,
  MembershipStatus,
  RegistrationStatus,
  ResultType,
} from "../constants";

export interface RegistrationDto {
  id: string;
  status: RegistrationStatus;
  result: ResultType | null;
  registeredAt: string;
  checkedInAt: string | null;
}

export interface ViewerRegistration {
  status: RegistrationStatus;
  result: ResultType | null;
  registeredAt: string;
}

export interface EventViewer {
  manages: boolean;
  isOrganizer: boolean;
  membership: MembershipStatus | null;
  registration: ViewerRegistration | null;
}

export interface EventClubDto {
  id: string;
  name: string;
  slug: string;
}

export interface EventDto {
  id: string;
  title: string;
  slug: string;
  category: EventCategory;
  description: string | null;
  bannerUrl: string | null;
  venue: string | null;
  startsAt: string | null;
  endsAt: string | null;
  capacity: number | null;
  status: EventStatus;
  registeredCount: number;
  club: EventClubDto;
  viewer: EventViewer;
}

export interface EventPersonDto {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
}

export interface EventResultDto extends EventPersonDto {
  result: ResultType;
}

export interface EventDetailDto extends EventDto {
  organizer: EventPersonDto | null;
  results: EventResultDto[] | null;
}

export interface EventListResult {
  events: EventDto[];
  total: number;
  page: number;
  limit: number;
}

export type EventSort = "soonest" | "latest" | "newest";

export interface EventListParams {
  search?: string;
  category?: EventCategory;
  club?: string;
  status?: EventStatus;
  from?: string;
  to?: string;
  manage?: boolean;
  registered?: boolean;
  available?: boolean;
  sort: EventSort;
  page: number;
}

export const eventKeys = {
  all: ["events"] as const,
  list: (params: EventListParams) => ["events", "list", params] as const,
  detail: (slug: string) => ["events", "detail", slug] as const,
};

export function eventsQueryOptions(params: EventListParams) {
  return queryOptions({
    queryKey: eventKeys.list(params),
    queryFn: ({ signal }) =>
      api.get<EventListResult>("/events", {
        signal,
        params: {
          search: params.search,
          category: params.category,
          club: params.club,
          status: params.status,
          from: params.from,
          to: params.to,
          manage: params.manage ? true : undefined,
          registered: params.registered ? true : undefined,
          available: params.available ? true : undefined,
          sort: params.sort,
          page: params.page,
        },
      }),
  });
}

export function eventQueryOptions(slug: string) {
  return queryOptions({
    queryKey: eventKeys.detail(slug),
    queryFn: ({ signal }) =>
      api.get<{ event: EventDetailDto }>(`/events/${slug}`, { signal }),
  });
}

export interface CreateEventInput {
  clubSlug: string;
  title: string;
  slug: string;
  category: EventCategory;
  description?: string;
  startsAt?: string;
  endsAt?: string;
  capacity?: number;
  venue?: string;
  bannerUploadId?: string;
}

export interface UpdateEventInput {
  title?: string;
  category?: EventCategory;
  description?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  capacity?: number | null;
  venue?: string | null;
  organizerUserId?: string | null;
  bannerUploadId?: string;
}

export function createEvent(input: CreateEventInput) {
  return api.post<{ event: EventDetailDto }>("/events", input);
}

export function updateEvent(slug: string, input: UpdateEventInput) {
  return api.patch<{ event: EventDetailDto }>(`/events/${slug}`, input);
}

export function setEventStatus(
  slug: string,
  status: "published" | "cancelled",
) {
  return api.patch<{ event: EventDetailDto }>(`/events/${slug}/status`, {
    status,
  });
}

export function deleteEvent(slug: string): Promise<void> {
  return api.del(`/events/${slug}`);
}

export function registerForEvent(slug: string) {
  return api.post<{ registration: ViewerRegistration }>(
    `/events/${slug}/registrations`,
  );
}

export function cancelRegistration(slug: string): Promise<void> {
  return api.del(`/events/${slug}/registrations`);
}

export interface RegistrationRowDto extends RegistrationDto {
  student: EventPersonDto;
}

export interface RosterResult {
  registrations: RegistrationRowDto[];
  total: number;
  page: number;
  limit: number;
}

export interface RosterParams {
  search?: string;
  status?: RegistrationStatus;
  result?: ResultType;
  page: number;
  limit?: number;
}

export interface PublishResultsInput {
  winnerUserId: string | null;
  runnerUpUserIds: string[];
}

export const rosterKeys = {
  all: (slug: string) => ["events", "roster", slug] as const,
  list: (slug: string, params: RosterParams) =>
    ["events", "roster", slug, params] as const,
};

export function rosterQueryOptions(slug: string, params: RosterParams) {
  return queryOptions({
    queryKey: rosterKeys.list(slug, params),
    queryFn: ({ signal }) =>
      api.get<RosterResult>(`/events/${slug}/registrations`, {
        signal,
        params: {
          search: params.search,
          status: params.status,
          result: params.result,
          page: params.page,
          limit: params.limit,
        },
      }),
  });
}

export function openCheckin(slug: string) {
  return api.post<{ event: EventDetailDto }>(`/events/${slug}/checkin`);
}

export function checkInStudent(slug: string, userId: string) {
  return api.patch<{ registration: RegistrationDto }>(
    `/events/${slug}/registrations/${userId}`,
    { status: "checked_in" },
  );
}

export function publishResults(slug: string, input: PublishResultsInput) {
  return api.put<{ event: EventDetailDto }>(`/events/${slug}/results`, input);
}
