import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ArrowRightIcon,
  CheckIcon,
  CompassIcon,
  CrownIcon,
  HourglassIcon,
  PlusIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UsersIcon,
  XIcon,
} from "lucide-react";
import { z } from "zod";
import { ConfirmDialog } from "@/components/confirm-dialog";
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
  SectionCard,
  StatusBadge,
} from "@/components/dashboard-kit";
import {
  AccentBand,
  GroupHeading,
  HexCrest,
  IconChip,
  MetaChip,
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
import { CLUB_CATEGORY_META } from "@/lib/category";
import { CLUB_CATEGORIES, CLUB_STATUSES, CLUB_TYPES } from "@/lib/constants";
import { isApiError } from "@/lib/errors";
import { optimisticJoin, restore } from "@/lib/optimistic";
import { labelOf } from "@/lib/labels";
import { canCreateClub, isAdmin, isStudent } from "@/lib/permissions";
import {
  clubKeys,
  clubsQueryOptions,
  decideClub,
  joinClub,
  type ClubDto,
} from "@/lib/queries/clubs";
import { useMe } from "@/lib/queries/me";
import { stretchedLinkClass } from "@/lib/utils";

const CLUB_SORTS = ["name", "newest"] as const;

const clubSearchSchema = z.object({
  search: z.string().trim().min(1).max(120).optional(),
  category: z.enum(CLUB_CATEGORIES).optional(),
  type: z.enum(CLUB_TYPES).optional(),
  status: z.enum(CLUB_STATUSES).optional(),
  sort: z.enum(CLUB_SORTS).default("name"),
  page: z.coerce.number().int().min(1).default(1),
});

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

const CATEGORY_ITEMS = options(CLUB_CATEGORIES);
const TYPE_ITEMS = options(CLUB_TYPES);
const STATUS_ITEMS = options(CLUB_STATUSES);
const SORT_ITEMS = [
  { value: "name", label: "Name" },
  { value: "newest", label: "Newest" },
];

export const Route = createFileRoute("/_auth/clubs/")({
  head: () => ({ meta: [{ title: "Clubs · Hive" }] }),
  validateSearch: clubSearchSchema,
  component: ClubsPage,
});

type JoinHandler = {
  join: (slug: string) => void;
  pendingSlug: string | null;
};

function RelationTag({ club }: { club: ClubDto }) {
  if (!club.viewer) return null;

  if (club.viewer.status === "approved") {
    return club.viewer.role === "leader" ? (
      <Badge className="shadow-sm">
        <CrownIcon />
        Leader
      </Badge>
    ) : (
      <Badge className="bg-background/85 text-foreground shadow-sm ring-1 ring-foreground/10 backdrop-blur-sm">
        <CheckIcon />
        Member
      </Badge>
    );
  }

  if (club.viewer.status === "pending") {
    return (
      <Badge className="bg-background/85 text-muted-foreground shadow-sm ring-1 ring-foreground/10 backdrop-blur-sm">
        <HourglassIcon />
        Requested
      </Badge>
    );
  }

  return null;
}

function ClubFoot({
  club,
  joinable,
  handler,
}: {
  club: ClubDto;
  joinable: boolean;
  handler?: JoinHandler;
}) {
  if (club.viewer?.status === "pending") {
    return (
      <span className="text-xs font-medium text-muted-foreground">
        Awaiting the leader
      </span>
    );
  }

  if (joinable && handler) {
    return (
      <Button
        size="sm"
        className="relative z-10"
        disabled={handler.pendingSlug === club.slug}
        onClick={(event) => {
          event.preventDefault();
          handler.join(club.slug);
        }}
      >
        {handler.pendingSlug === club.slug ? "Sending" : "Ask to join"}
      </Button>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-primary transition-transform group-hover/club:translate-x-0.5">
      Open
      <ArrowRightIcon className="size-3.5" />
    </span>
  );
}

function ClubCard({
  club,
  showStatus,
  handler,
}: {
  club: ClubDto;
  showStatus: boolean;
  handler?: JoinHandler;
}) {
  const meta = CLUB_CATEGORY_META[club.category];
  const joinable =
    handler !== undefined &&
    club.status === "approved" &&
    (club.viewer === null || club.viewer.status === "rejected");

  return (
    <Card className="group/club relative h-full gap-0 py-0 transition-shadow hover:shadow-lg">
      <AccentBand accent={meta.accent} className="h-20">
        <div className="absolute inset-x-4 top-3.5 flex items-start justify-between gap-2">
          <IconChip icon={meta.icon} />
          <RelationTag club={club} />
        </div>
      </AccentBand>

      <div className="flex flex-1 flex-col gap-3 px-5 pb-5">
        <HexCrest
          src={club.logoUrl}
          name={club.name}
          className="-mt-8 size-16"
        />

        <div className="min-w-0">
          <h3 className="truncate font-heading text-entry">
            {club.name}
          </h3>
          <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <span>{labelOf(club.category)}</span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1">
              {club.type === "official" ? (
                <ShieldCheckIcon className="size-3.5" />
              ) : null}
              {labelOf(club.type)}
            </span>
          </p>
        </div>

        <p className="line-clamp-2 text-sm text-muted-foreground">
          {club.description ?? "No description yet."}
        </p>

        <div className="mt-auto flex items-center justify-between gap-2 border-t pt-3">
          <MetaChip icon={UsersIcon}>
            {club.memberCount} {club.memberCount === 1 ? "member" : "members"}
          </MetaChip>
          <div className="flex items-center gap-2">
            {showStatus || club.status !== "approved" ? (
              <StatusBadge value={club.status} />
            ) : null}
            <ClubFoot club={club} joinable={joinable} handler={handler} />
          </div>
        </div>
      </div>

      <Link
        to="/clubs/$slug"
        params={{ slug: club.slug }}
        className={stretchedLinkClass}
      >
        <span className="sr-only">Open {club.name}</span>
      </Link>
    </Card>
  );
}

function ClubGrid({
  clubs,
  showStatus,
  handler,
}: {
  clubs: ClubDto[];
  showStatus: boolean;
  handler?: JoinHandler;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {clubs.map((club) => (
        <ClubCard
          key={club.id}
          club={club}
          showStatus={showStatus}
          handler={handler}
        />
      ))}
    </div>
  );
}

function YourClubs({ clubs }: { clubs: ClubDto[] }) {
  const leading = clubs.filter(
    (club) =>
      club.viewer?.role === "leader" && club.viewer.status === "approved",
  );
  const joined = clubs.filter(
    (club) =>
      club.viewer?.role === "member" && club.viewer.status === "approved",
  );
  const waiting = clubs.filter((club) => club.viewer?.status === "pending");

  if (clubs.length === 0) {
    return (
      <Card className="gap-0 py-0">
        <div className="flex flex-wrap items-center gap-4 p-5">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <SparklesIcon className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-heading text-entry">
              You are not in a club yet
            </p>
            <p className="text-sm text-muted-foreground">
              Ask to join one below, or start your own and invite people.
            </p>
          </div>
          <Button variant="outline" render={<Link to="/clubs/new" />}>
            <PlusIcon />
            Start a club
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {leading.length > 0 ? (
        <section className="flex flex-col gap-4">
          <GroupHeading
            icon={CrownIcon}
            title="Managed clubs"
            count={leading.length}
          />
          <ClubGrid clubs={leading} showStatus={false} />
        </section>
      ) : null}

      {joined.length > 0 ? (
        <section className="flex flex-col gap-4">
          <GroupHeading
            icon={UsersIcon}
            title="Joined clubs"
            count={joined.length}
          />
          <ClubGrid clubs={joined} showStatus={false} />
        </section>
      ) : null}

      {waiting.length > 0 ? (
        <section className="flex flex-col gap-4">
          <GroupHeading
            icon={HourglassIcon}
            title="Pending requests"
            count={waiting.length}
          />
          <Card className="gap-0 py-2">
            <RowGroup>
              {waiting.map((club) => (
                <DataRow key={club.id}>
                  <HexCrest
                    src={club.logoUrl}
                    name={club.name}
                    className="size-10"
                  />
                  <div className="min-w-0 flex-1">
                    <Link
                      to="/clubs/$slug"
                      params={{ slug: club.slug }}
                      className="font-medium hover:underline"
                    >
                      {club.name}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {labelOf(club.category)} · {labelOf(club.type)}
                    </p>
                  </div>
                  <StatusBadge value="pending" />
                </DataRow>
              ))}
            </RowGroup>
          </Card>
        </section>
      ) : null}
    </div>
  );
}

function ClubRequests() {
  const queryClient = useQueryClient();
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
      toast.add({ title: `Club ${variables.status}`, type: "success" });
    },
    onError: (error) => {
      toast.add({
        title: isApiError(error) ? error.message : "Could not decide",
        type: "error",
      });
    },
  });

  const rows = pending.data?.clubs ?? [];

  return (
    <SectionCard
      title="Pending approvals"
      action={
        rows.length > 0 ? (
          <Badge variant="outline">{rows.length} pending</Badge>
        ) : null
      }
    >
      {pending.isError ? (
        <ErrorState
          error={pending.error}
          onRetry={() => void pending.refetch()}
        />
      ) : pending.isPending ? (
        <Skeleton className="m-2 h-20" />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={CheckIcon}
          title="Nothing to review"
          description="New official club requests will appear here"
        />
      ) : (
        <RowGroup>
          {rows.map((club) => (
            <DataRow key={club.id}>
              <HexCrest
                src={club.logoUrl}
                name={club.name}
                className="size-10"
              />
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
                trigger={<Button size="sm" />}
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
                trigger={<Button size="sm" variant="outline" />}
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
  );
}

function ClubsPage() {
  const user = useMe();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const queryClient = useQueryClient();

  const admin = isAdmin(user);
  const student = isStudent(user);

  const browse = useQuery(clubsQueryOptions(search));
  const mine = useQuery({
    ...clubsQueryOptions({ mine: true, sort: "name", page: 1 }),
    enabled: student,
  });

  const join = useMutation({
    mutationFn: (slug: string) => joinClub(slug),
    onMutate: (slug) => optimisticJoin(queryClient, slug),
    onSuccess: () => {
      toast.add({ title: "Request sent", type: "success" });
    },
    onError: (error, _slug, snapshot) => {
      restore(queryClient, snapshot);
      toast.add({
        title: isApiError(error) ? error.message : "Could not send the request",
        type: "error",
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: clubKeys.all });
    },
  });

  const handler: JoinHandler | undefined = student
    ? {
        join: (slug) => join.mutate(slug),
        pendingSlug: join.isPending ? (join.variables ?? null) : null,
      }
    : undefined;

  const setFilter = (patch: Partial<typeof search>) => {
    void navigate({ search: (prev) => ({ ...prev, ...patch, page: 1 }) });
  };

  const lastPage = browse.data
    ? Math.max(1, Math.ceil(browse.data.total / browse.data.limit))
    : 1;

  return (
    <PageShell>
      <PageHeader title="Clubs">
        {canCreateClub(user) ? (
          <Button render={<Link to="/clubs/new" />}>
            <PlusIcon />
            New club
          </Button>
        ) : null}
      </PageHeader>

      {admin ? <ClubRequests /> : null}

      {student && mine.data ? <YourClubs clubs={mine.data.clubs} /> : null}

      <section className="flex flex-col gap-4">
        <GroupHeading
          icon={CompassIcon}
          title="All clubs"
          count={browse.data?.total}
        />

        <FilterBar>
          <FilterField label="Search" className="grow">
            <SearchField
              className="w-full sm:min-w-52"
              placeholder="Club name"
              defaultValue={search.search}
              onSearch={(value) => setFilter({ search: value })}
            />
          </FilterField>

          <FilterField label="Category">
            <Select
              items={CATEGORY_ITEMS}
              value={search.category ?? ALL}
              onValueChange={(value) =>
                setFilter({ category: pick(value, CLUB_CATEGORIES) })
              }
            >
              <SelectTrigger className="w-full sm:w-44">
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

          <FilterField label="Type">
            <Select
              items={TYPE_ITEMS}
              value={search.type ?? ALL}
              onValueChange={(value) =>
                setFilter({ type: pick(value, CLUB_TYPES) })
              }
            >
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPE_ITEMS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>

          {admin ? (
            <FilterField label="Status">
              <Select
                items={STATUS_ITEMS}
                value={search.status ?? ALL}
                onValueChange={(value) =>
                  setFilter({ status: pick(value, CLUB_STATUSES) })
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
          ) : null}

          <FilterField label="Sort">
            <Select
              items={SORT_ITEMS}
              value={search.sort}
              onValueChange={(value) =>
                setFilter({ sort: pick(value, CLUB_SORTS) ?? "name" })
              }
            >
              <SelectTrigger className="w-full sm:w-36">
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
        </FilterBar>

        {browse.isError ? (
          <ErrorState
            error={browse.error}
            onRetry={() => void browse.refetch()}
          />
        ) : browse.isPending ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-64 w-full rounded-2xl" />
            ))}
          </div>
        ) : browse.data && browse.data.clubs.length > 0 ? (
          <>
            <ClubGrid
              clubs={browse.data.clubs}
              showStatus={admin}
              handler={handler}
            />
            {lastPage > 1 ? (
              <Card className="gap-0 py-0">
                <Pagination
                  flat
                  page={browse.data.page}
                  lastPage={lastPage}
                  onChange={(next) =>
                    void navigate({
                      search: (prev) => ({ ...prev, page: next }),
                    })
                  }
                />
              </Card>
            ) : null}
          </>
        ) : (
          <Card className="gap-0 py-0">
            <EmptyState
              icon={CompassIcon}
              title="No clubs match those filters"
              description="Clear a filter or search for a different name"
            />
          </Card>
        )}
      </section>
    </PageShell>
  );
}
