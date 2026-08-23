import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import {
  ArrowLeftIcon,
  AwardIcon,
  CalendarIcon,
  CheckIcon,
  ClockIcon,
  CrownIcon,
  MapPinIcon,
  MedalIcon,
  PencilIcon,
  SettingsIcon,
  TicketIcon,
  TrophyIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PageShell, SectionCard, StatusBadge } from "@/components/dashboard-kit";
import {
  AccentBand,
  DateChit,
  HexPattern,
  IconChip,
  MetaChip,
  Meter,
} from "@/components/entity-kit";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { EVENT_CATEGORY_META } from "@/lib/category";
import type { ResultType } from "@/lib/constants";
import { isApiError } from "@/lib/errors";
import { labelOf } from "@/lib/labels";
import {
  canCancelRegistration,
  canEditEvent,
  canRegister,
  canRunEvent,
  needsMembershipToRegister,
} from "@/lib/permissions";
import {
  cancelRegistration,
  eventKeys,
  eventQueryOptions,
  registerForEvent,
  type EventDetailDto,
} from "@/lib/queries/events";
import { useMe } from "@/lib/queries/me";
import { backLinkClass, initials } from "@/lib/utils";

export const Route = createFileRoute("/_auth/events/$slug/")({
  head: ({ params }) => ({ meta: [{ title: `${params.slug} · Hive` }] }),
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(eventQueryOptions(params.slug)),
  component: EventDetailPage,
});

const RESULT_ICONS: Record<ResultType, LucideIcon> = {
  winner: TrophyIcon,
  runner_up: MedalIcon,
  participant: AwardIcon,
};

function seatsLabel(event: EventDetailDto): string {
  if (event.capacity === null) {
    return `${event.registeredCount} registered`;
  }
  if (event.registeredCount >= event.capacity) {
    return `Full · ${event.capacity} seats`;
  }
  return `${event.registeredCount} of ${event.capacity} seats taken`;
}

function Fact({
  icon: Icon,
  label,
  value,
  children,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  children?: React.ReactNode;
}) {
  return (
    <Card className="gap-0 py-0">
      <div className="flex flex-col gap-2 p-4">
        <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Icon className="size-3.5" />
          {label}
        </span>
        <span className="text-sm font-medium">{value}</span>
        {children}
      </div>
    </Card>
  );
}

function EventDetailPage() {
  const { slug } = Route.useParams();
  const user = useMe();
  const queryClient = useQueryClient();
  const { data, isPending } = useQuery(eventQueryOptions(slug));

  const invalidate = () =>
    void queryClient.invalidateQueries({ queryKey: eventKeys.all });

  const onError = (error: unknown) => {
    toast.add({
      title: isApiError(error) ? error.message : "Something went wrong",
      type: "error",
    });
  };

  const register = useMutation({
    mutationFn: () => registerForEvent(slug),
    onSuccess: () => {
      invalidate();
      toast.add({ title: "Seat booked", type: "success" });
    },
    onError,
  });

  const cancel = useMutation({
    mutationFn: () => cancelRegistration(slug),
    onSuccess: () => {
      invalidate();
      toast.add({ title: "Registration cancelled", type: "success" });
    },
    onError,
  });

  if (isPending || !data) {
    return (
      <PageShell>
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-56 w-full rounded-2xl" />
      </PageShell>
    );
  }

  const event = data.event;
  const meta = EVENT_CATEGORY_META[event.category];
  const starts = event.startsAt ? new Date(event.startsAt) : null;
  const registration = event.viewer.registration;
  const isFull =
    event.capacity !== null && event.registeredCount >= event.capacity;
  const busy = register.isPending || cancel.isPending;

  const header = (
    <div className="absolute inset-x-5 top-4 flex items-start justify-between gap-2">
      <IconChip icon={meta.icon} className="size-9" />
      <div className="flex flex-wrap justify-end gap-2">
        <Badge className="bg-background/85 text-foreground shadow-sm ring-1 ring-foreground/10 backdrop-blur-sm">
          {labelOf(event.category)}
        </Badge>
        {event.status === "published" ? null : (
          <StatusBadge value={event.status} className="shadow-sm" />
        )}
        {event.viewer.manages || event.viewer.isOrganizer ? (
          <Badge className="bg-background/85 text-muted-foreground shadow-sm ring-1 ring-foreground/10 backdrop-blur-sm">
            <CrownIcon />
            {event.viewer.manages ? "You lead" : "You organise"}
          </Badge>
        ) : null}
      </div>
    </div>
  );

  return (
    <PageShell>
      <Link to="/events" className={backLinkClass}>
        <ArrowLeftIcon className="size-4" />
        Back to events
      </Link>

      <Card className="gap-0 py-0">
        {event.bannerUrl ? (
          <div className="relative h-40 overflow-hidden sm:h-52">
            <img
              src={event.bannerUrl}
              alt=""
              className="size-full object-cover"
              onError={(broken) => {
                broken.currentTarget.style.display = "none";
              }}
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-card/90 to-card/10"
            />
            <HexPattern className="text-foreground/[0.08]" />
            {header}
          </div>
        ) : (
          <AccentBand accent={meta.accent} className="h-32 sm:h-40">
            {header}
          </AccentBand>
        )}

        <div className="flex flex-wrap items-end justify-between gap-4 px-5 pb-5">
          <div className="min-w-0">
            <div className="-mt-7 flex items-end gap-3">
              <DateChit date={starts} />
              <MetaChip icon={ClockIcon} className="pb-1">
                {starts
                  ? format(starts, "EEEE d MMM yyyy, h:mm a")
                  : "Date to be announced"}
              </MetaChip>
            </div>

            <h1 className="mt-3 font-heading text-title">
              {event.title}
            </h1>

            <Link
              to="/clubs/$slug"
              params={{ slug: event.club.slug }}
              className="text-sm text-muted-foreground hover:underline"
            >
              {event.club.name}
            </Link>
          </div>

          <div className="flex flex-wrap gap-2">
            {canEditEvent(user, event) ? (
              <Button
                variant="outline"
                render={<Link to="/events/$slug/edit" params={{ slug }} />}
              >
                <PencilIcon />
                Edit
              </Button>
            ) : null}
            {canRunEvent(user, event) ? (
              <Button
                variant="outline"
                render={<Link to="/events/$slug/manage" params={{ slug }} />}
              >
                <SettingsIcon />
                {event.status === "draft" ? "Publish" : "Manage"}
              </Button>
            ) : null}

            {registration?.status === "checked_in" ? (
              <Badge className="h-9 px-3">
                <CheckIcon />
                Checked in
              </Badge>
            ) : canCancelRegistration(user, event) ? (
              <ConfirmDialog
                trigger={<Button variant="outline" disabled={busy} />}
                triggerLabel={
                  cancel.isPending ? "Cancelling" : "Give up my seat"
                }
                title="Give up your seat?"
                description="You can register again while check-in has not opened, but the seat may be taken by then."
                confirmLabel="Cancel registration"
                destructive
                pending={busy}
                onConfirm={() => cancel.mutate()}
              />
            ) : canRegister(user, event) ? (
              <Button
                disabled={busy || isFull}
                onClick={() => register.mutate()}
              >
                <TicketIcon />
                {register.isPending
                  ? "Registering"
                  : isFull
                    ? "Event is full"
                    : "Register"}
              </Button>
            ) : needsMembershipToRegister(user, event) ? (
              <Button
                variant="outline"
                render={
                  <Link to="/clubs/$slug" params={{ slug: event.club.slug }} />
                }
              >
                Join the club to register
              </Button>
            ) : null}
          </div>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <Fact
          icon={CalendarIcon}
          label="When"
          value={
            starts ? format(starts, "d MMM yyyy, h:mm a") : "To be announced"
          }
        />
        <Fact
          icon={MapPinIcon}
          label="Where"
          value={event.venue ?? "To be announced"}
        />
        <Fact icon={UsersIcon} label="Seats" value={seatsLabel(event)}>
          {event.capacity === null ? null : (
            <Meter value={event.registeredCount} max={event.capacity} />
          )}
        </Fact>
      </div>

      <SectionCard
        title="About"
        description={
          event.organizer
            ? `Organised by ${event.organizer.fullName}`
            : `Run by ${event.club.name}`
        }
      >
        <p className="px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap">
          {event.description ?? "The organisers have not written this up yet."}
        </p>
      </SectionCard>

      {event.results && event.results.length > 0 ? (
        <SectionCard title="Results">
          <div className="flex flex-col gap-0.5">
            {event.results.map((person) => {
              const Icon = RESULT_ICONS[person.result];
              const top = person.result === "winner";

              return (
                <div
                  key={person.userId}
                  className={
                    top
                      ? "flex items-center gap-3 rounded-xl bg-primary/5 px-3 py-3"
                      : "flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-muted/60"
                  }
                >
                  <span
                    className={
                      top
                        ? "flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground"
                        : "flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground"
                    }
                  >
                    <Icon className="size-4" />
                  </span>
                  <Avatar className="size-9">
                    {person.avatarUrl ? (
                      <AvatarImage src={person.avatarUrl} alt="" />
                    ) : null}
                    <AvatarFallback>{initials(person.fullName)}</AvatarFallback>
                  </Avatar>
                  <Link
                    to="/users/$id"
                    params={{ id: person.userId }}
                    className="flex-1 text-sm font-medium hover:underline"
                  >
                    {person.fullName}
                  </Link>
                  <Badge variant={top ? "default" : "outline"}>
                    {labelOf(person.result)}
                  </Badge>
                </div>
              );
            })}
          </div>
        </SectionCard>
      ) : null}
    </PageShell>
  );
}
