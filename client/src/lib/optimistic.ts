import type { QueryClient } from "@tanstack/react-query";
import { clubKeys, type ClubDto } from "./queries/clubs";
import { eventKeys, type EventDto } from "./queries/events";
import {
  notificationKeys,
  type NotificationDto,
  type NotificationListResult,
} from "./queries/notifications";

type Snapshot = [readonly unknown[], unknown][];

function patchAll<T>(
  queryClient: QueryClient,
  key: readonly unknown[],
  update: (data: T) => T,
): Snapshot {
  const snapshot = queryClient.getQueriesData<T>({ queryKey: key });
  queryClient.setQueriesData<T>({ queryKey: key }, (data) =>
    data === undefined ? data : update(data),
  );
  return snapshot as Snapshot;
}

export function restore(queryClient: QueryClient, snapshot?: Snapshot): void {
  for (const [key, data] of snapshot ?? []) {
    queryClient.setQueryData(key, data);
  }
}

/** A seat is booked the moment the button is pressed; the refetch confirms it. */
export async function optimisticRegister(
  queryClient: QueryClient,
  slug: string,
): Promise<Snapshot> {
  await queryClient.cancelQueries({ queryKey: eventKeys.all });

  const lists = patchAll<{ events: EventDto[] }>(
    queryClient,
    eventKeys.all,
    (data) =>
      Array.isArray(data.events)
        ? {
            ...data,
            events: data.events.map((event) =>
              event.slug === slug ? withSeat(event) : event,
            ),
          }
        : data,
  );

  const detail = patchAll<{ event: EventDto }>(
    queryClient,
    eventKeys.detail(slug),
    (data) => (data.event ? { ...data, event: withSeat(data.event) } : data),
  );

  return [...lists, ...detail];
}

function withSeat<T extends EventDto>(event: T): T {
  if (event.viewer.registration?.status === "registered") return event;

  return {
    ...event,
    registeredCount: event.registeredCount + 1,
    viewer: {
      ...event.viewer,
      registration: {
        status: "registered",
        result: null,
        registeredAt: new Date().toISOString(),
      },
    },
  };
}

/** A join request shows as pending immediately. */
export async function optimisticJoin(
  queryClient: QueryClient,
  slug: string,
): Promise<Snapshot> {
  await queryClient.cancelQueries({ queryKey: clubKeys.all });

  const lists = patchAll<{ clubs: ClubDto[] }>(
    queryClient,
    clubKeys.all,
    (data) =>
      Array.isArray(data.clubs)
        ? {
            ...data,
            clubs: data.clubs.map((club) =>
              club.slug === slug ? withRequest(club) : club,
            ),
          }
        : data,
  );

  const detail = patchAll<{ club: ClubDto }>(
    queryClient,
    clubKeys.detail(slug),
    (data) => (data.club ? { ...data, club: withRequest(data.club) } : data),
  );

  return [...lists, ...detail];
}

function withRequest<T extends ClubDto>(club: T): T {
  return {
    ...club,
    viewer: { status: "pending", role: "member" },
  };
}

/** Marking a notification read must feel instant — it is a one-way flag. */
export async function optimisticRead(
  queryClient: QueryClient,
  id: string,
): Promise<Snapshot> {
  await queryClient.cancelQueries({ queryKey: notificationKeys.all });

  return patchAll<NotificationListResult>(
    queryClient,
    notificationKeys.all,
    (data) => {
      if (!Array.isArray(data.notifications)) return data;

      let cleared = 0;
      const notifications = data.notifications.map(
        (notification: NotificationDto) => {
          if (notification.id !== id || notification.readAt !== null) {
            return notification;
          }
          cleared += 1;
          return { ...notification, readAt: new Date().toISOString() };
        },
      );

      return {
        ...data,
        notifications,
        unread: Math.max(0, data.unread - cleared),
      };
    },
  );
}
