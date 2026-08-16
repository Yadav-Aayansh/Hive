import { queryOptions } from "@tanstack/react-query";
import { api } from "../api";

export interface AnnouncementAuthorDto {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
}

export interface AnnouncementClubDto {
  slug: string;
  name: string;
}

export interface AnnouncementDto {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  club: AnnouncementClubDto;
  author: AnnouncementAuthorDto;
  canManage: boolean;
}

export interface AnnouncementListResult {
  announcements: AnnouncementDto[];
  total: number;
  page: number;
  limit: number;
}

export interface AnnouncementListParams {
  search?: string;
  club?: string;
  page: number;
}

export interface CreateAnnouncementInput {
  clubSlug: string;
  title: string;
  body: string;
}

export interface UpdateAnnouncementInput {
  title?: string;
  body?: string;
}

export const announcementKeys = {
  all: ["announcements"] as const,
  list: (params: AnnouncementListParams) =>
    ["announcements", "list", params] as const,
  detail: (id: string) => ["announcements", "detail", id] as const,
};

export function announcementsQueryOptions(params: AnnouncementListParams) {
  return queryOptions({
    queryKey: announcementKeys.list(params),
    queryFn: ({ signal }) =>
      api.get<AnnouncementListResult>("/announcements", {
        signal,
        params: {
          search: params.search,
          club: params.club,
          page: params.page,
        },
      }),
  });
}

export function announcementQueryOptions(id: string) {
  return queryOptions({
    queryKey: announcementKeys.detail(id),
    queryFn: ({ signal }) =>
      api.get<{ announcement: AnnouncementDto }>(`/announcements/${id}`, {
        signal,
      }),
  });
}

export function createAnnouncement(input: CreateAnnouncementInput) {
  return api.post<{ announcement: AnnouncementDto }>("/announcements", input);
}

export function updateAnnouncement(id: string, input: UpdateAnnouncementInput) {
  return api.patch<{ announcement: AnnouncementDto }>(
    `/announcements/${id}`,
    input,
  );
}

export function deleteAnnouncement(id: string): Promise<void> {
  return api.del(`/announcements/${id}`);
}
