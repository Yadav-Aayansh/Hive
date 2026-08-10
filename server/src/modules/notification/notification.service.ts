import { IsNull } from "typeorm";
import { AppDataSource } from "../../config/data-source";
import { logger } from "../../config/logger";
import {
  Notification,
  type NotificationType,
} from "../../entity/Notification";
import type { UserRole } from "../../entity/User";
import { NotFoundError } from "../../utils/AppError";
import type { ListNotificationsInput } from "./notification.schema";

const INSERT_CHUNK = 500;

export interface Actor {
  id: string;
  role: UserRole;
  collegeId: string;
}

export interface NotificationDto {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  readAt: Date | null;
  createdAt: Date;
}

export interface NotificationDraft {
  type: NotificationType;
  title: string;
  body?: string | null;
  link?: string | null;
}

function notifications() {
  return AppDataSource.getRepository(Notification);
}

function toNotificationDto(notification: Notification): NotificationDto {
  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    link: notification.link,
    readAt: notification.readAt,
    createdAt: notification.createdAt,
  };
}

export async function notify(
  userIds: string[],
  draft: NotificationDraft,
): Promise<void> {
  const recipients = [...new Set(userIds)];

  if (recipients.length === 0) {
    return;
  }

  try {
    for (let start = 0; start < recipients.length; start += INSERT_CHUNK) {
      await notifications().insert(
        recipients.slice(start, start + INSERT_CHUNK).map((userId) => ({
          userId,
          type: draft.type,
          title: draft.title,
          body: draft.body ?? null,
          link: draft.link ?? null,
          readAt: null,
        })),
      );
    }
  } catch (err) {
    logger.warn({ err, type: draft.type }, "Failed to write notifications");
  }
}

export async function dropNotificationsByLink(link: string): Promise<void> {
  try {
    await notifications().delete({ link });
  } catch (err) {
    logger.warn({ err, link }, "Failed to delete notifications for link");
  }
}

export async function listNotifications(
  actor: Actor,
  input: ListNotificationsInput,
): Promise<{
  notifications: NotificationDto[];
  total: number;
  unread: number;
  page: number;
  limit: number;
}> {
  const [rows, total] = await notifications().findAndCount({
    where: input.unread
      ? { userId: actor.id, readAt: IsNull() }
      : { userId: actor.id },
    order: { createdAt: "DESC" },
    skip: (input.page - 1) * input.limit,
    take: input.limit,
  });

  const unread = await notifications().countBy({
    userId: actor.id,
    readAt: IsNull(),
  });

  return {
    notifications: rows.map(toNotificationDto),
    total,
    unread,
    page: input.page,
    limit: input.limit,
  };
}

export async function markRead(
  actor: Actor,
  id: string,
): Promise<NotificationDto> {
  const notification = await notifications().findOneBy({
    id,
    userId: actor.id,
  });

  if (!notification) {
    throw new NotFoundError("Notification not found");
  }

  if (!notification.readAt) {
    notification.readAt = new Date();
    await notifications().save(notification);
  }

  return toNotificationDto(notification);
}

export async function markAllRead(actor: Actor): Promise<{ updated: number }> {
  const result = await notifications().update(
    { userId: actor.id, readAt: IsNull() },
    { readAt: new Date() },
  );

  return { updated: result.affected ?? 0 };
}
