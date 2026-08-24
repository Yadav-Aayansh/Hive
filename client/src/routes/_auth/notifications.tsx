import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import {
  BellIcon,
  CalendarDaysIcon,
  CheckCheckIcon,
  MegaphoneIcon,
  TrophyIcon,
  UserPlusIcon,
  UsersIcon,
  XCircleIcon,
} from "lucide-react";
import { z } from "zod";
import {
  EmptyState,
  ErrorState,
  PageHeader,
  PageShell,
  Pagination,
  SectionCard,
} from "@/components/dashboard-kit";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import type { NotificationType } from "@/lib/constants";
import { isApiError } from "@/lib/errors";
import { optimisticRead, restore } from "@/lib/optimistic";
import {
  markAllRead,
  markRead,
  notificationKeys,
  notificationsQueryOptions,
  type NotificationDto,
} from "@/lib/queries/notifications";

const notificationSearchSchema = z.object({
  unread: z.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
});

const ICONS: Record<NotificationType, typeof BellIcon> = {
  club_approved: UsersIcon,
  club_rejected: XCircleIcon,
  join_requested: UserPlusIcon,
  join_approved: UsersIcon,
  join_rejected: XCircleIcon,
  event_published: CalendarDaysIcon,
  event_cancelled: XCircleIcon,
  results_published: TrophyIcon,
  announcement_posted: MegaphoneIcon,
};

export const Route = createFileRoute("/_auth/notifications")({
  head: () => ({ meta: [{ title: "Notifications · Hive" }] }),
  validateSearch: notificationSearchSchema,
  component: NotificationsPage,
});

function NotificationsPage() {
  const search = Route.useSearch();
  const routeNavigate = Route.useNavigate();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isPending, isError, error, refetch } = useQuery(
    notificationsQueryOptions(search),
  );

  const invalidate = () =>
    void queryClient.invalidateQueries({ queryKey: notificationKeys.all });

  const read = useMutation({
    mutationFn: markRead,
    onMutate: (id: string) => optimisticRead(queryClient, id),
    onError: (error, _id, snapshot) => {
      restore(queryClient, snapshot);
      toast.add({
        title: isApiError(error) ? error.message : "Could not mark as read",
        type: "error",
      });
    },
    onSettled: invalidate,
  });

  const readAll = useMutation({
    mutationFn: markAllRead,
    onSuccess: (result) => {
      invalidate();
      toast.add({
        title:
          result.updated === 0
            ? "Nothing left to read"
            : `Marked ${result.updated} as read`,
        type: "success",
      });
    },
    onError: (error) => {
      toast.add({
        title: isApiError(error) ? error.message : "Could not mark all as read",
        type: "error",
      });
    },
  });

  const openNotification = (notification: NotificationDto) => {
    if (!notification.readAt) {
      read.mutate(notification.id);
    }
    if (notification.link) {
      void navigate({ href: notification.link });
    }
  };

  const rows = data?.notifications ?? [];
  const lastPage = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <PageShell size="narrow">
      <PageHeader title="Notifications">
          <Button
            variant={search.unread ? "default" : "outline"}
            onClick={() =>
              void routeNavigate({
                search: { unread: search.unread ? undefined : true, page: 1 },
              })
            }
          >
            Unread only
          </Button>
          <Button
            variant="outline"
            disabled={readAll.isPending || (data?.unread ?? 0) === 0}
            onClick={() => readAll.mutate()}
          >
            <CheckCheckIcon />
            Mark all read
          </Button>
      </PageHeader>

      <SectionCard
        title="Recent activity"
        bare
      >
      {isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : isPending ? (
        <div className="flex flex-col gap-2 p-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full" />
          ))}
        </div>
      ) : rows.length > 0 ? (
        <>
          <div className="flex flex-col gap-1 p-2">
            {rows.map((notification) => {
              const Icon = ICONS[notification.type];
              const unread = notification.readAt === null;

              return (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => openNotification(notification)}
                  className={cn(
                    "flex items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                    unread ? "bg-muted/40" : "",
                  )}
                >
                  <div
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-full",
                      unread
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    <Icon className="size-4" />
                  </div>

                  <div className="flex-1">
                    <p
                      className={cn(
                        "text-sm",
                        unread ? "font-medium" : "font-normal",
                      )}
                    >
                      {notification.title}
                    </p>
                    {notification.body ? (
                      <p className="text-muted-foreground text-sm">
                        {notification.body}
                      </p>
                    ) : null}
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {formatDistanceToNow(new Date(notification.createdAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>

                  {unread ? (
                    <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                  ) : null}
                </button>
              );
            })}
          </div>

          <Pagination
            page={search.page}
            lastPage={lastPage}
            onChange={(next) =>
              void routeNavigate({ search: (prev) => ({ ...prev, page: next }) })
            }
          />
        </>
      ) : (
        <EmptyState
          icon={BellIcon}
          title={search.unread ? "Nothing unread" : "No notifications"}
          description="Club approvals, join requests, new events and results all land here"
        />
      )}
      </SectionCard>
    </PageShell>
  );
}
