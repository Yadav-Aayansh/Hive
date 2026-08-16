import { queryOptions } from "@tanstack/react-query";
import { api } from "../api";
import type { NotificationType } from "../constants";

export interface NotificationDto {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationListResult {
  notifications: NotificationDto[];
  total: number;
  unread: number;
  page: number;
  limit: number;
}

export interface NotificationListParams {
  unread?: boolean;
  page: number;
  limit?: number;
}

export const notificationKeys = {
  all: ["notifications"] as const,
  list: (params: NotificationListParams) =>
    ["notifications", "list", params] as const,
};

export function notificationsQueryOptions(params: NotificationListParams) {
  return queryOptions({
    queryKey: notificationKeys.list(params),
    queryFn: ({ signal }) =>
      api.get<NotificationListResult>("/notifications", {
        signal,
        params: {
          unread: params.unread ? true : undefined,
          page: params.page,
          limit: params.limit,
        },
      }),
  });
}

export const unreadCountQueryOptions = queryOptions({
  queryKey: ["notifications", "unread-count"] as const,
  queryFn: ({ signal }) =>
    api.get<NotificationListResult>("/notifications", {
      signal,
      params: { page: 1, limit: 1 },
    }),
  select: (data) => data.unread,
  refetchInterval: 60 * 1000,
});

export function markRead(id: string) {
  return api.patch<{ notification: NotificationDto }>(
    `/notifications/${id}/read`,
  );
}

export function markAllRead() {
  return api.post<{ updated: number }>("/notifications/read-all");
}
