import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import {
  ArrowRightIcon,
  AwardIcon,
  BuildingIcon,
  CalendarDaysIcon,
  CheckIcon,
  UsersIcon,
  XIcon,
} from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  DataRow,
  EmptyState,
  PageHeader,
  PageShell,
  RowGroup,
  SectionCard,
  StatCard,
  StatusBadge,
} from "@/components/dashboard-kit";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import { isApiError } from "@/lib/errors";
import { labelOf } from "@/lib/labels";
import { certificatesQueryOptions } from "@/lib/queries/certificates";
import {
  clubKeys,
  clubsQueryOptions,
  decideClub,
  decideMembership,
  membersQueryOptions,
  type ClubDto,
} from "@/lib/queries/clubs";
import { collegeStatsQueryOptions } from "@/lib/queries/colleges";
import { eventsQueryOptions } from "@/lib/queries/events";
import { initials } from "@/lib/utils";

export const Route = createFileRoute("/_auth/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard · Hive" }] }),
  component: DashboardPage,
});


function toastError(error: unknown) {
  toast.add({
    title: isApiError(error) ? error.message : "Something went wrong",
    type: "error",
  });
}

function firstName(name?: string): string {
  return name?.split(" ")[0] ?? "there";
}

function StatSkeletons({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={index} className="h-32 w-full rounded-2xl" />
      ))}
    </div>
  );
}

function DashboardPage() {
  const { user } = Route.useRouteContext();

  const myClubs = useQuery({
    ...clubsQueryOptions({ mine: true, sort: "name", page: 1 }),
    enabled: user.role === "student",
  });

  if (user.role === "campus_admin") {
    return <AdminDashboard />;
  }

  const led = (myClubs.data?.clubs ?? []).filter(
    (club) =>
      club.viewer?.role === "leader" && club.viewer.status === "approved",
  );

  if (led.length === 0) {
    return <StudentDashboard name={user.fullName} />;
  }

  return (
    <PageShell>
      <PageHeader title={`Welcome back, ${firstName(user.fullName)}`}>
        <Button
          variant="outline"
          render={<Link to="/events" search={{ available: true }} />}
        >
          Browse events
        </Button>
      </PageHeader>

      <Tabs defaultValue="leading">
        <TabsList>
          <TabsTrigger value="leading">Leading</TabsTrigger>
          <TabsTrigger value="activity">My activity</TabsTrigger>
        </TabsList>
        <TabsContent value="leading" className="pt-4">
          <LeaderDashboard clubs={led} />
        </TabsContent>
        <TabsContent value="activity" className="pt-4">
          <StudentDashboard name={user.fullName} bare />
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}

function AdminDashboard() {
  const queryClient = useQueryClient();
  const stats = useQuery(collegeStatsQueryOptions);
  const pending = useQuery(
    clubsQueryOptions({
      status: "pending",
      type: "official",
      sort: "newest",
      page: 1,
    }),
  );

  const decide = useMutation({
    mutationFn: ({
      slug,
      status,
    }: {
      slug: string;
      status: "approved" | "rejected";
    }) => decideClub(slug, status),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: clubKeys.all });
      void queryClient.invalidateQueries({
        queryKey: collegeStatsQueryOptions.queryKey,
      });
      toast.add({ title: `Club ${variables.status}`, type: "success" });
    },
    onError: toastError,
  });

  const rows = pending.data?.clubs ?? [];

  return (
    <PageShell>
      <PageHeader title="Campus overview">
        <Button variant="outline" render={<Link to="/college" />}>
          College settings
        </Button>
      </PageHeader>

      {stats.isPending ? (
        <StatSkeletons />
      ) : stats.data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Clubs"
            value={stats.data.stats.clubs.total}
            hint={`${stats.data.stats.clubs.pending} awaiting approval`}
            icon={BuildingIcon}
            tone="t4"
          />
          <StatCard
            label="Events"
            value={stats.data.stats.events.total}
            hint={`${stats.data.stats.events.published} published`}
            icon={CalendarDaysIcon}
            tone="t3"
          />
          <StatCard
            label="Students"
            value={stats.data.stats.members}
            hint="across every club"
            icon={UsersIcon}
            tone="t2"
          />
          <StatCard
            label="Certificates"
            value={stats.data.stats.certificates}
            hint="issued to date"
            icon={AwardIcon}
            tone="t1"
          />
        </div>
      ) : null}

      <SectionCard
        title="Pending approvals"
        action={
          rows.length > 0 ? (
            <Badge variant="outline">{rows.length} pending</Badge>
          ) : null
        }
      >
        {pending.isPending ? (
          <Skeleton className="m-2 h-24" />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={BuildingIcon}
            title="Nothing to review"
            description="New official club requests will appear here"
          />
        ) : (
          <RowGroup>
            {rows.map((club) => (
              <DataRow key={club.id}>
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <BuildingIcon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <Link
                    to="/clubs/$slug"
                    params={{ slug: club.slug }}
                    className="font-medium hover:underline"
                  >
                    {club.name}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {labelOf(club.category)} · {club.memberCount}{" "}
                    {club.memberCount === 1 ? "member" : "members"}
                  </p>
                </div>
                <ConfirmDialog
                  trigger={<Button size="sm" disabled={decide.isPending} loading={decide.isPending} />}
                  triggerLabel={
                    <>
                      <CheckIcon />
                      Approve
                    </>
                  }
                  title={`Approve ${club.name}?`}
                  description="It can run events and issue certificates from then on. This cannot be undone."
                  confirmLabel="Approve club"
                  pending={decide.isPending}
                  onConfirm={() =>
                    decide.mutate({ slug: club.slug, status: "approved" })
                  }
                />
                <ConfirmDialog
                  trigger={
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={decide.isPending} loading={decide.isPending}
                    />
                  }
                  triggerLabel={
                    <>
                      <XIcon />
                      Reject
                    </>
                  }
                  title={`Reject ${club.name}?`}
                  description="The leader keeps the club but it stays unofficial and cannot issue certificates."
                  confirmLabel="Reject club"
                  destructive
                  pending={decide.isPending}
                  onConfirm={() =>
                    decide.mutate({ slug: club.slug, status: "rejected" })
                  }
                />
              </DataRow>
            ))}
          </RowGroup>
        )}
      </SectionCard>
    </PageShell>
  );
}

function LeaderDashboard({ clubs }: { clubs: ClubDto[] }) {
  const queryClient = useQueryClient();

  const memberQueries = useQueries({
    queries: clubs.map((club) => membersQueryOptions(club.slug)),
  });

  const events = useQuery(
    eventsQueryOptions({ manage: true, sort: "soonest", page: 1 }),
  );

  const decide = useMutation({
    mutationFn: ({
      slug,
      userId,
      status,
    }: {
      slug: string;
      userId: string;
      status: "approved" | "rejected";
    }) => decideMembership(slug, userId, status),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: clubKeys.all });
      void queryClient.invalidateQueries({
        queryKey: ["clubs", "members", variables.slug],
      });
      toast.add({ title: `Request ${variables.status}`, type: "success" });
    },
    onError: toastError,
  });

  const requests = clubs.flatMap((club, index) =>
    (memberQueries[index]?.data?.members ?? [])
      .filter((member) => member.status === "pending")
      .map((member) => ({ club, member })),
  );

  const loadingRequests = memberQueries.some((query) => query.isPending);
  const upcoming = events.data?.events ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Clubs led"
          value={clubs.length}
          hint="with an approved leader seat"
          icon={BuildingIcon}
          tone="t4"
        />
        <StatCard
          label="Join requests"
          value={loadingRequests ? "—" : requests.length}
          hint="waiting on you"
          icon={UsersIcon}
          tone="t3"
        />
        <StatCard
          label="Events you manage"
          value={events.data?.total ?? "—"}
          hint="across your clubs"
          icon={CalendarDaysIcon}
          tone="t2"
        />
      </div>

      <SectionCard title="Join requests">
        {loadingRequests ? (
          <Skeleton className="m-2 h-24" />
        ) : requests.length === 0 ? (
          <EmptyState
            icon={UsersIcon}
            title="No pending requests"
            description="Students who ask to join will show up here"
          />
        ) : (
          <RowGroup>
            {requests.map(({ club, member }) => (
              <DataRow key={`${club.id}-${member.userId}`}>
                <Avatar className="size-9">
                  {member.avatarUrl ? (
                    <AvatarImage src={member.avatarUrl} alt="" />
                  ) : null}
                  <AvatarFallback>{initials(member.fullName)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{member.fullName}</p>
                  <p className="text-sm text-muted-foreground">
                    {club.name} · asked{" "}
                    {format(new Date(member.requestedAt), "d MMM")}
                  </p>
                </div>
                <Button
                  size="sm"
                  disabled={decide.isPending} loading={decide.isPending}
                  onClick={() =>
                    decide.mutate({
                      slug: club.slug,
                      userId: member.userId,
                      status: "approved",
                    })
                  }
                >
                  <CheckIcon />
                  Approve
                </Button>
                <ConfirmDialog
                  trigger={
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={decide.isPending} loading={decide.isPending}
                    />
                  }
                  triggerLabel={
                    <>
                      <XIcon />
                      Reject
                    </>
                  }
                  title={`Reject ${member.fullName}?`}
                  description="They stay out of the club and will not see its wall. They can ask again later."
                  confirmLabel="Reject request"
                  destructive
                  pending={decide.isPending}
                  onConfirm={() =>
                    decide.mutate({
                      slug: club.slug,
                      userId: member.userId,
                      status: "rejected",
                    })
                  }
                />
              </DataRow>
            ))}
          </RowGroup>
        )}
      </SectionCard>

      <SectionCard
        title="Managed events"
        action={
          <Button
            size="sm"
            variant="ghost"
            render={<Link to="/events" search={{ manage: true }} />}
          >
            View all
            <ArrowRightIcon />
          </Button>
        }
      >
        {events.isPending ? (
          <Skeleton className="m-2 h-24" />
        ) : upcoming.length === 0 ? (
          <EmptyState
            icon={CalendarDaysIcon}
            title="No events yet"
            description="Create one from your club page"
          />
        ) : (
          <RowGroup>
            {upcoming.slice(0, 6).map((event) => (
              <DataRow key={event.id}>
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <CalendarDaysIcon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <Link
                    to="/events/$slug"
                    params={{ slug: event.slug }}
                    className="font-medium hover:underline"
                  >
                    {event.title}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {event.startsAt
                      ? format(new Date(event.startsAt), "d MMM yyyy, h:mm a")
                      : "Date to be announced"}{" "}
                    · {event.registeredCount} registered
                  </p>
                </div>
                <StatusBadge value={event.status} />
                <Button
                  size="sm"
                  variant="outline"
                  render={
                    <Link
                      to="/events/$slug/manage"
                      params={{ slug: event.slug }}
                    />
                  }
                >
                  Manage
                </Button>
              </DataRow>
            ))}
          </RowGroup>
        )}
      </SectionCard>
    </div>
  );
}

function StudentDashboard({ name, bare }: { name: string; bare?: boolean }) {
  const clubs = useQuery(
    clubsQueryOptions({ mine: true, sort: "name", page: 1 }),
  );
  const registered = useQuery(
    eventsQueryOptions({ registered: true, sort: "soonest", page: 1 }),
  );
  const certificates = useQuery(certificatesQueryOptions(1, 5));

  const body = (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="My clubs"
          value={clubs.data?.total ?? "—"}
          hint="approved memberships"
          icon={BuildingIcon}
          tone="t4"
        />
        <StatCard
          label="Registered events"
          value={registered.data?.total ?? "—"}
          hint="seats you are holding"
          icon={CalendarDaysIcon}
          tone="t3"
        />
        <StatCard
          label="Certificates"
          value={certificates.data?.total ?? "—"}
          hint="in your wallet"
          icon={AwardIcon}
          tone="t2"
        />
      </div>

      <SectionCard
        title="Registered events"
        action={
          <Button
            size="sm"
            variant="ghost"
            render={<Link to="/events" search={{ registered: true }} />}
          >
            View all
            <ArrowRightIcon />
          </Button>
        }
      >
        {registered.isPending ? (
          <Skeleton className="m-2 h-24" />
        ) : (registered.data?.events.length ?? 0) === 0 ? (
          <EmptyState
            icon={CalendarDaysIcon}
            title="Nothing booked"
            description="Find something to join on the events page"
          >
            <Button
              size="sm"
              variant="outline"
              render={<Link to="/events" search={{ available: true }} />}
            >
              Browse events
            </Button>
          </EmptyState>
        ) : (
          <RowGroup>
            {registered.data?.events.slice(0, 6).map((event) => (
              <DataRow key={event.id}>
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <CalendarDaysIcon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <Link
                    to="/events/$slug"
                    params={{ slug: event.slug }}
                    className="font-medium hover:underline"
                  >
                    {event.title}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {event.club.name} ·{" "}
                    {event.startsAt
                      ? format(new Date(event.startsAt), "d MMM yyyy, h:mm a")
                      : "Date to be announced"}
                  </p>
                </div>
                {event.viewer.registration ? (
                  <StatusBadge value={event.viewer.registration.status} />
                ) : null}
              </DataRow>
            ))}
          </RowGroup>
        )}
      </SectionCard>

      <SectionCard
        title="Recent certificates"
        action={
          <Button size="sm" variant="ghost" render={<Link to="/certificates" />}>
            View all
            <ArrowRightIcon />
          </Button>
        }
      >
        {certificates.isPending ? (
          <Skeleton className="m-2 h-24" />
        ) : (certificates.data?.certificates.length ?? 0) === 0 ? (
          <EmptyState
            icon={AwardIcon}
            title="No certificates yet"
            description="Attend an event and they land here automatically"
          />
        ) : (
          <RowGroup>
            {certificates.data?.certificates.map((certificate) => (
              <DataRow key={certificate.serial}>
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <AwardIcon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{certificate.event.title}</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {certificate.serial}
                  </p>
                </div>
                <Badge variant="outline">
                  {labelOf(certificate.result)}
                </Badge>
              </DataRow>
            ))}
          </RowGroup>
        )}
      </SectionCard>
    </div>
  );

  if (bare) return body;

  return (
    <PageShell>
      <PageHeader title={`Welcome back, ${firstName(name)}`}>
        <Button
          variant="outline"
          render={<Link to="/clubs" search={{ sort: "name" }} />}
        >
          Find a club
        </Button>
        <Button render={<Link to="/events" search={{ available: true }} />}>
          Browse events
        </Button>
      </PageHeader>
      {body}
    </PageShell>
  );
}
