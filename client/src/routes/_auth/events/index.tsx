import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { addDays, format, isToday, isTomorrow } from "date-fns";
import {
  CalendarIcon,
  CheckIcon,
  ClockIcon,
  CrownIcon,
  MapPinIcon,
  PencilLineIcon,
  PlusIcon,
  SlidersHorizontalIcon,
  SparklesIcon,
  TicketIcon,
  UsersIcon,
} from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { DateField } from "@/components/date-time-field";
import {
  DataRow,
  EmptyState,
  ErrorState,
  FilterBar,
  FilterField,
  PageHeader,
  PageShell,
  Pagination,
  RowGroup,
  SearchField,
  StatusBadge,
} from "@/components/dashboard-kit";
import {
  AccentBand,
  DateChit,
  GroupHeading,
  HexPattern,
  IconChip,
  MetaChip,
  Meter,
} from "@/components/entity-kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { EVENT_CATEGORY_META } from "@/lib/category";
import { EVENT_CATEGORIES, EVENT_STATUSES } from "@/lib/constants";
import { isApiError } from "@/lib/errors";
import { optimisticRegister, restore } from "@/lib/optimistic";
import { labelOf } from "@/lib/labels";
import {
  canCreateEvent,
  canRegister,
  isStudent,
  registerBlock,
} from "@/lib/permissions";
import { clubsQueryOptions } from "@/lib/queries/clubs";
import {
  eventKeys,
  eventsQueryOptions,
  registerForEvent,
  type EventDto,
} from "@/lib/queries/events";
import { useMe, type UserDto } from "@/lib/queries/me";
import { stretchedLinkClass } from "@/lib/utils";

const EVENT_SORTS = ["soonest", "latest", "newest"] as const;

const eventSearchSchema = z.object({
  search: z.string().trim().min(1).max(160).optional(),
  category: z.enum(EVENT_CATEGORIES).optional(),
  club: z.string().trim().min(2).max(60).optional(),
  status: z.enum(EVENT_STATUSES).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  manage: z.boolean().optional(),
  registered: z.boolean().optional(),
  available: z.boolean().optional(),
  sort: z.enum(EVENT_SORTS).default("soonest"),
  page: z.coerce.number().int().min(1).default(1),
});

type EventSearch = z.infer<typeof eventSearchSchema>;

const ALL = "all";

function options<T extends string>(values: readonly T[]) {
  return [
    { value: ALL, label: "All" },
    ...values.map((value) => ({ value, label: labelOf(value) })),
  ];
}

function pick<T extends string>(
  value: unknown,
  values: readonly T[],
): T | undefined {
  return values.includes(value as T) ? (value as T) : undefined;
}

const CATEGORY_ITEMS = options(EVENT_CATEGORIES);
const STATUS_ITEMS = options(EVENT_STATUSES);
const SORT_ITEMS = [
  { value: "soonest", label: "Soonest first" },
  { value: "latest", label: "Latest first" },
  { value: "newest", label: "Recently added" },
];

const SHOW_ITEMS = [
  { value: "all", label: "All events" },
  { value: "available", label: "Open" },
  { value: "registered", label: "Registered" },
  { value: "manage", label: "Managed" },
];

const RANGES: { label: string; value: () => { from: string; to: string } }[] = [
  {
    label: "This week",
    value: () => ({
      from: new Date().toISOString(),
      to: addDays(new Date(), 7).toISOString(),
    }),
  },
  {
    label: "This month",
    value: () => ({
      from: new Date().toISOString(),
      to: addDays(new Date(), 30).toISOString(),
    }),
  },
];

const BROWSE_TITLE: Record<string, string> = {
  all: "All events",
  available: "Open for registration",
  registered: "Registered events",
  manage: "Managed events",
};

type Bucket = "today" | "soon" | "later" | "tba" | "past";

const BUCKETS: { key: Bucket; title: string }[] = [
  { key: "today", title: "Today" },
  { key: "soon", title: "This week" },
  { key: "later", title: "Coming later" },
  { key: "tba", title: "Date not announced" },
  { key: "past", title: "Already finished" },
];

function bucketOf(event: EventDto, now: Date): Bucket {
  if (!event.startsAt) return "tba";

  const starts = new Date(event.startsAt);
  const ends = event.endsAt ? new Date(event.endsAt) : starts;

  if (ends.getTime() < now.getTime()) return "past";
  if (isToday(starts)) return "today";
  if (starts.getTime() < addDays(now, 7).getTime()) return "soon";
  return "later";
}

function whenLabel(event: EventDto): string {
  if (!event.startsAt) return "Time to be announced";

  const starts = new Date(event.startsAt);
  if (isToday(starts)) return `Today, ${format(starts, "h:mm a")}`;
  if (isTomorrow(starts)) return `Tomorrow, ${format(starts, "h:mm a")}`;
  return format(starts, "EEE d MMM, h:mm a");
}

function seatsLabel(event: EventDto): string {
  if (event.capacity === null) {
    return `${event.registeredCount} registered`;
  }
  if (event.registeredCount >= event.capacity) {
    return `Full · ${event.capacity} seats`;
  }
  return `${event.registeredCount} of ${event.capacity} seats taken`;
}

function scopeOf(search: EventSearch): string {
  if (search.manage) return "manage";
  if (search.registered) return "registered";
  if (search.available) return "available";
  return "all";
}

export const Route = createFileRoute("/_auth/events/")({
  head: () => ({ meta: [{ title: "Events · Hive" }] }),
  validateSearch: eventSearchSchema,
  component: EventsPage,
});

type RegisterHandler = {
  register: (slug: string) => void;
  pendingSlug: string | null;
};

function ViewerTag({ event }: { event: EventDto }) {
  if (event.viewer.registration?.status === "checked_in") {
    return (
      <Badge className="shadow-sm">
        <CheckIcon />
        Checked in
      </Badge>
    );
  }

  if (event.viewer.registration?.status === "registered") {
    return (
      <Badge className="bg-background/85 text-foreground shadow-sm ring-1 ring-foreground/10 backdrop-blur-sm">
        <TicketIcon />
        Registered
      </Badge>
    );
  }

  if (event.viewer.manages || event.viewer.isOrganizer) {
    return (
      <Badge className="bg-background/85 text-muted-foreground shadow-sm ring-1 ring-foreground/10 backdrop-blur-sm">
        <CrownIcon />
        {event.viewer.manages ? "You lead" : "You organise"}
      </Badge>
    );
  }

  return null;
}

function EventFoot({
  user,
  event,
  handler,
}: {
  user: UserDto;
  event: EventDto;
  handler?: RegisterHandler;
}) {
  const registration = event.viewer.registration;

  if (registration?.status === "checked_in") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary">
        <CheckIcon className="size-3.5" />
        You attended
      </span>
    );
  }

  if (registration?.status === "registered") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary">
        <TicketIcon className="size-3.5" />
        Seat confirmed
      </span>
    );
  }

  if (handler && canRegister(user, event)) {
    return (
      <Button
        size="sm"
        className="relative z-10"
        disabled={handler.pendingSlug === event.slug}
        onClick={(clicked) => {
          clicked.preventDefault();
          handler.register(event.slug);
        }}
      >
        {handler.pendingSlug === event.slug ? "Registering" : "Register"}
      </Button>
    );
  }

  const blocked = registerBlock(user, event);

  if (blocked) {
    return (
      <span className="text-xs font-medium text-muted-foreground">
        {blocked}
      </span>
    );
  }

  if (
    isStudent(user) &&
    event.status === "published" &&
    event.viewer.membership !== "approved"
  ) {
    return (
      <span className="text-xs font-medium text-muted-foreground">
        Members only
      </span>
    );
  }

  return null;
}

function EventCard({
  user,
  event,
  handler,
}: {
  user: UserDto;
  event: EventDto;
  handler?: RegisterHandler;
}) {
  const meta = EVENT_CATEGORY_META[event.category];
  const starts = event.startsAt ? new Date(event.startsAt) : null;

  const header = (
    <div className="absolute inset-x-5 top-4 flex items-start justify-between gap-2">
      <IconChip icon={meta.icon} />
      <div className="flex flex-wrap justify-end gap-2">
        {event.status === "published" ? null : (
          <StatusBadge value={event.status} className="shadow-sm" />
        )}
        <ViewerTag event={event} />
      </div>
    </div>
  );

  return (
    <Card className="group/event relative h-full gap-0 py-0 transition-shadow hover:shadow-lg">
      {event.bannerUrl ? (
        <div className="relative h-28 overflow-hidden">
          <img
            src={event.bannerUrl}
            alt=""
            className="size-full object-cover transition-transform duration-500 group-hover/event:scale-105"
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
        <AccentBand accent={meta.accent} className="h-28">
          {header}
        </AccentBand>
      )}

      <div className="flex flex-1 flex-col gap-3 px-5 pb-5">
        <div className="-mt-7 flex items-end justify-between gap-3">
          <DateChit date={starts} />
          <MetaChip icon={ClockIcon} className="pb-1">
            {whenLabel(event)}
          </MetaChip>
        </div>

        <div className="min-w-0">
          <h3 className="line-clamp-2 font-heading text-entry">
            {event.title}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {event.club.name} · {labelOf(event.category)}
          </p>
        </div>

        <MetaChip icon={MapPinIcon}>
          {event.venue ?? "Venue to be announced"}
        </MetaChip>

        <div className="mt-auto flex flex-col gap-2 pt-1">
          {event.capacity === null ? null : (
            <Meter value={event.registeredCount} max={event.capacity} />
          )}
          <div className="flex items-center justify-between gap-2 border-t pt-3">
            <MetaChip icon={UsersIcon}>{seatsLabel(event)}</MetaChip>
            <EventFoot user={user} event={event} handler={handler} />
          </div>
        </div>
      </div>

      <Link
        to="/events/$slug"
        params={{ slug: event.slug }}
        className={stretchedLinkClass}
      >
        <span className="sr-only">Open {event.title}</span>
      </Link>
    </Card>
  );
}

function EventGrid({
  user,
  events,
  handler,
}: {
  user: UserDto;
  events: EventDto[];
  handler?: RegisterHandler;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {events.map((event) => (
        <EventCard
          key={event.id}
          user={user}
          event={event}
          handler={handler}
        />
      ))}
    </div>
  );
}

function BucketLabel({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
        {title}
      </span>
      <span aria-hidden="true" className="h-px flex-1 bg-border" />
      <span className="text-xs text-muted-foreground tabular-nums">
        {count}
      </span>
    </div>
  );
}

function YourEvents({
  user,
  seats,
  runs,
  now,
}: {
  user: UserDto;
  seats: EventDto[];
  runs: EventDto[];
  now: Date;
}) {
  const upcomingSeats = seats.filter(
    (event) => bucketOf(event, now) !== "past",
  );
  const running = runs.filter(
    (event) => event.status !== "draft" && bucketOf(event, now) !== "past",
  );
  const drafts = runs.filter((event) => event.status === "draft");

  if (
    upcomingSeats.length === 0 &&
    running.length === 0 &&
    drafts.length === 0
  ) {
    return (
      <Card className="gap-0 py-0">
        <div className="flex flex-wrap items-center gap-4 p-5">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <SparklesIcon className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-heading text-entry">
              You have no upcoming events
            </p>
            <p className="text-sm text-muted-foreground">
              Register for one below, or run your own if you lead a club.
            </p>
          </div>
          {canCreateEvent(user) ? (
            <Button variant="outline" render={<Link to="/events/new" />}>
              <PlusIcon />
              New event
            </Button>
          ) : null}
        </div>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {upcomingSeats.length > 0 ? (
        <section className="flex flex-col gap-4">
          <GroupHeading
            icon={TicketIcon}
            title="Registered events"
            count={upcomingSeats.length}
          />
          <EventGrid user={user} events={upcomingSeats} />
        </section>
      ) : null}

      {running.length > 0 ? (
        <section className="flex flex-col gap-4">
          <GroupHeading
            icon={CrownIcon}
            title="Managed events"
            count={running.length}
          />
          <EventGrid user={user} events={running} />
        </section>
      ) : null}

      {drafts.length > 0 ? (
        <section className="flex flex-col gap-4">
          <GroupHeading
            icon={PencilLineIcon}
            title="Drafts"
            count={drafts.length}
          />
          <Card className="gap-0 py-2">
            <RowGroup>
              {drafts.map((event) => (
                <DataRow key={event.id}>
                  <DateChit
                    date={event.startsAt ? new Date(event.startsAt) : null}
                  />
                  <div className="min-w-0 flex-1">
                    <Link
                      to="/events/$slug"
                      params={{ slug: event.slug }}
                      className="font-medium hover:underline"
                    >
                      {event.title}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {event.club.name} · {labelOf(event.category)}
                    </p>
                  </div>
                  <StatusBadge value="draft" />
                </DataRow>
              ))}
            </RowGroup>
          </Card>
        </section>
      ) : null}
    </div>
  );
}

function EventsPage() {
  const user = useMe();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const queryClient = useQueryClient();

  const student = isStudent(user);
  const scope = scopeOf(search);
  const personal = student && scope === "all";

  const [showMore, setShowMore] = useState(
    () =>
      Boolean(search.club) ||
      Boolean(search.status) ||
      Boolean(search.from) ||
      Boolean(search.to),
  );

  const { data, isPending, isError, error, refetch } = useQuery(
    eventsQueryOptions(search),
  );
  const clubs = useQuery(clubsQueryOptions({ sort: "name", page: 1 }));

  const seats = useQuery({
    ...eventsQueryOptions({ registered: true, sort: "soonest", page: 1 }),
    enabled: personal,
  });
  const runs = useQuery({
    ...eventsQueryOptions({ manage: true, sort: "soonest", page: 1 }),
    enabled: personal,
  });

  const register = useMutation({
    mutationFn: (slug: string) => registerForEvent(slug),
    onMutate: (slug) => optimisticRegister(queryClient, slug),
    onSuccess: () => {
      toast.add({ title: "Seat booked", type: "success" });
    },
    onError: (error, _slug, snapshot) => {
      restore(queryClient, snapshot);
      toast.add({
        title: isApiError(error) ? error.message : "Could not register",
        type: "error",
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: eventKeys.all });
    },
  });

  const handler: RegisterHandler | undefined = student
    ? {
        register: (slug) => register.mutate(slug),
        pendingSlug: register.isPending ? (register.variables ?? null) : null,
      }
    : undefined;

  const setFilter = (patch: Partial<EventSearch>) => {
    void navigate({
      search: (prev) => ({ ...prev, ...patch, page: 1 }),
      resetScroll: false,
    });
  };

  const setScope = (next: string) => {
    setFilter({
      available: next === "available" ? true : undefined,
      registered: next === "registered" ? true : undefined,
      manage: next === "manage" ? true : undefined,
    });
  };

  const clubItems = [
    { value: ALL, label: "All clubs" },
    ...(clubs.data?.clubs ?? []).map((club) => ({
      value: club.slug,
      label: club.name,
    })),
  ];

  const events = data?.events ?? [];
  const lastPage = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;
  const grouped = search.sort === "soonest";
  const now = new Date();

  const groups = BUCKETS.map((bucket) => ({
    ...bucket,
    events: events.filter((event) => bucketOf(event, now) === bucket.key),
  })).filter((group) => group.events.length > 0);

  return (
    <PageShell>
      <PageHeader title="Events">
        {canCreateEvent(user) ? (
          <Button render={<Link to="/events/new" />}>
            <PlusIcon />
            New event
          </Button>
        ) : null}
      </PageHeader>

      {personal && seats.data && runs.data ? (
        <YourEvents
          user={user}
          seats={seats.data.events}
          runs={runs.data.events}
          now={now}
        />
      ) : null}

      <section className="flex flex-col gap-4">
        <GroupHeading
          icon={CalendarIcon}
          title={BROWSE_TITLE[scope] ?? BROWSE_TITLE.all}
          count={data?.total}
        />

        <FilterBar>
          <FilterField label="Search" className="grow">
            <SearchField
              className="w-full sm:min-w-52"
              placeholder="Event title"
              defaultValue={search.search}
              onSearch={(value) => setFilter({ search: value })}
            />
          </FilterField>

          {student ? (
            <FilterField label="Show">
              <Select
                items={SHOW_ITEMS}
                value={scope}
                onValueChange={(value) => setScope(String(value))}
              >
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SHOW_ITEMS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterField>
          ) : null}

          <FilterField label="Category">
            <Select
              items={CATEGORY_ITEMS}
              value={search.category ?? ALL}
              onValueChange={(value) =>
                setFilter({ category: pick(value, EVENT_CATEGORIES) })
              }
            >
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_ITEMS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label="Sort">
            <Select
              items={SORT_ITEMS}
              value={search.sort}
              onValueChange={(value) =>
                setFilter({ sort: pick(value, EVENT_SORTS) ?? "soonest" })
              }
            >
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_ITEMS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>

          <Button
            variant={showMore ? "default" : "outline"}
            onClick={() => setShowMore((open) => !open)}
          >
            <SlidersHorizontalIcon />
            More filters
          </Button>

          {showMore ? (
            <div className="flex w-full flex-wrap items-end gap-3 border-t pt-4">
              <FilterField label="Club">
                <Select
                  items={clubItems}
                  value={search.club ?? ALL}
                  onValueChange={(value) =>
                    setFilter({
                      club: value === ALL ? undefined : String(value),
                    })
                  }
                >
                  <SelectTrigger className="w-full sm:w-52">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {clubItems.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FilterField>

              <FilterField label="Status">
                <Select
                  items={STATUS_ITEMS}
                  value={search.status ?? ALL}
                  onValueChange={(value) =>
                    setFilter({ status: pick(value, EVENT_STATUSES) })
                  }
                >
                  <SelectTrigger className="w-full sm:w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_ITEMS.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FilterField>

              <FilterField label="From">
                <DateField
                  value={search.from?.slice(0, 10) ?? ""}
                  onChange={(next) =>
                    setFilter({
                      from: next === "" ? undefined : new Date(next).toISOString(),
                    })
                  }
                />
              </FilterField>

              <FilterField label="To">
                <DateField
                  value={search.to?.slice(0, 10) ?? ""}
                  onChange={(next) =>
                    setFilter({
                      to: next === "" ? undefined : new Date(next).toISOString(),
                    })
                  }
                />
              </FilterField>

              <FilterField label="Quick range">
                <div className="flex flex-wrap gap-1.5">
                  {RANGES.map((range) => (
                    <Button
                      key={range.label}
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setFilter(range.value())}
                    >
                      {range.label}
                    </Button>
                  ))}
                </div>
              </FilterField>
            </div>
          ) : null}
        </FilterBar>

        {isError ? (
          <ErrorState error={error} onRetry={() => void refetch()} />
        ) : isPending ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-72 w-full rounded-2xl" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <Card className="gap-0 py-0">
            <EmptyState
              icon={CalendarIcon}
              title="No events match those filters"
              description={
                scope === "all"
                  ? "Clear a filter or widen the date range"
                  : "Switch Show back to all events to see what else is on"
              }
            >
              {scope === "all" ? null : (
                <Button variant="outline" onClick={() => setScope("all")}>
                  Show all events
                </Button>
              )}
            </EmptyState>
          </Card>
        ) : (
          <>
            {grouped ? (
              <div className="flex flex-col gap-6">
                {groups.map((group) => (
                  <div key={group.key} className="flex flex-col gap-3">
                    <BucketLabel
                      title={group.title}
                      count={group.events.length}
                    />
                    <EventGrid
                      user={user}
                      events={group.events}
                      handler={handler}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <EventGrid user={user} events={events} handler={handler} />
            )}

            {lastPage > 1 ? (
              <Card className="gap-0 py-0">
                <Pagination
                  flat
                  page={data?.page ?? 1}
                  lastPage={lastPage}
                  onChange={(next) =>
                    void navigate({
                      search: (prev) => ({ ...prev, page: next }),
                      resetScroll: false,
                    })
                  }
                />
              </Card>
            ) : null}
          </>
        )}
      </section>
    </PageShell>
  );
}
