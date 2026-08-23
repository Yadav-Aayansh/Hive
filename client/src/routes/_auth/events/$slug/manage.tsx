import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { format } from "date-fns";
import { ArrowLeftIcon, CheckIcon, UsersIcon } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  EmptyState,
  ErrorState,
  FilterBar,
  FilterField,
  PageHeader,
  PageShell,
  Pagination,
  SectionCard,
  StatusBadge,
} from "@/components/dashboard-kit";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/components/ui/toast";
import { backLinkClass } from "@/lib/utils";
import { REGISTRATION_STATUSES, RESULT_TYPES } from "@/lib/constants";
import { fieldErrorsOf, isApiError } from "@/lib/errors";
import { labelOf } from "@/lib/labels";
import {
  checkInStudent,
  eventKeys,
  eventQueryOptions,
  openCheckin,
  publishResults,
  rosterKeys,
  rosterQueryOptions,
  setEventStatus,
  type EventDetailDto,
  type RegistrationRowDto,
} from "@/lib/queries/events";

const ALL = "all";

const rosterSearchSchema = z.object({
  q: z.string().trim().min(1).max(120).optional(),
  status: z.enum(REGISTRATION_STATUSES).optional(),
  result: z.enum(RESULT_TYPES).optional(),
  page: z.coerce.number().int().min(1).default(1),
});

function options<T extends string>(values: readonly T[]) {
  return [
    { value: ALL, label: "All" },
    ...values.map((value) => ({ value, label: labelOf(value) })),
  ];
}

function pick<T extends string>(value: unknown, values: readonly T[]): T | undefined {
  return values.includes(value as T) ? (value as T) : undefined;
}

const STATUS_ITEMS = options(REGISTRATION_STATUSES);
const RESULT_ITEMS = options(RESULT_TYPES);

function initials(name?: string): string {
  if (!name) return "";
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}

export const Route = createFileRoute("/_auth/events/$slug/manage")({
  validateSearch: rosterSearchSchema,
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(
      eventQueryOptions(params.slug),
    );

    if (!data.event.viewer.manages && !data.event.viewer.isOrganizer) {
      throw notFound();
    }

    return data;
  },
  component: ManagePage,
});

function ManagePage() {
  const { slug } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const queryClient = useQueryClient();
  const [openedLocally, setOpenedLocally] = useState(false);

  const { data } = useQuery(eventQueryOptions(slug));
  const roster = useQuery(
    rosterQueryOptions(slug, {
      search: search.q,
      status: search.status,
      result: search.result,
      page: search.page,
    }),
  );

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: eventKeys.all });
    void queryClient.invalidateQueries({ queryKey: rosterKeys.all(slug) });
  };

  const onError = (error: unknown) => {
    toast.add({
      title: isApiError(error) ? error.message : "Something went wrong",
      type: "error",
    });
  };

  const open = useMutation({
    mutationFn: () => openCheckin(slug),
    onSuccess: () => {
      setOpenedLocally(true);
      invalidate();
      toast.add({ title: "Check-in is open", type: "success" });
    },
    onError: (error) => {
      if (isApiError(error) && error.code === "CONFLICT") {
        setOpenedLocally(true);
      }
      onError(error);
    },
  });

  const lifecycle = useMutation({
    mutationFn: (status: "published" | "cancelled") =>
      setEventStatus(slug, status),
    onSuccess: (_result, status) => {
      invalidate();
      toast.add({
        title: status === "published" ? "Event published" : "Event cancelled",
        type: "success",
      });
    },
    onError,
  });

  const attend = useMutation({
    mutationFn: (userId: string) => checkInStudent(slug, userId),
    onSuccess: () => {
      setOpenedLocally(true);
      invalidate();
    },
    onError,
  });

  if (!data) {
    return (
      <PageShell>
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </PageShell>
    );
  }

  const event = data.event;
  const rows = roster.data?.registrations ?? [];
  const resultsPublished = event.results !== null;
  const checkinOpen =
    resultsPublished ||
    openedLocally ||
    rows.some((row) => row.checkedInAt !== null);

  const setFilter = (patch: Partial<typeof search>) => {
    void navigate({ search: (prev) => ({ ...prev, ...patch, page: 1 }) });
  };

  const lastPage = roster.data
    ? Math.max(1, Math.ceil(roster.data.total / roster.data.limit))
    : 1;

  return (
    <PageShell>
      <Link to="/events/$slug" params={{ slug }} className={backLinkClass}>
        <ArrowLeftIcon className="size-4" />
        Back to event
      </Link>

      <PageHeader
        title={event.title}
        description={event.club.name}
      >
          {event.viewer.manages && event.status === "draft" ? (
            <ConfirmDialog
              trigger={<Button disabled={lifecycle.isPending} loading={lifecycle.isPending} />}
              triggerLabel={
                lifecycle.isPending ? "Publishing" : "Publish event"
              }
              title={`Publish ${event.title}?`}
              description="Every club member is notified and registrations open. You can cancel it later, but not put it back into draft."
              confirmLabel="Publish event"
              pending={lifecycle.isPending}
              onConfirm={() => lifecycle.mutate("published")}
            />
          ) : null}

          {event.viewer.manages && event.status === "published" && !resultsPublished ? (
            <CancelEventDialog
              title={event.title}
              registered={event.registeredCount}
              pending={lifecycle.isPending}
              onConfirm={() => lifecycle.mutate("cancelled")}
            />
          ) : null}

          <ConfirmDialog
            trigger={
              <Button
                variant="outline"
                disabled={
                  open.isPending || checkinOpen || event.status !== "published"
                }
              />
            }
            triggerLabel={
              open.isPending
                ? "Opening"
                : checkinOpen
                  ? "Check-in open"
                  : "Open check-in"
            }
            title="Open check-in?"
            description="This freezes the roster. Nobody can register or cancel after this, and it cannot be closed again."
            confirmLabel="Open check-in"
            pending={open.isPending}
            onConfirm={() => open.mutate()}
          />

          <PublishResultsDialog
            slug={slug}
            disabled={!checkinOpen || resultsPublished}
            onDone={invalidate}
          />
      </PageHeader>

      <Stages
        status={event.status}
        checkinOpen={checkinOpen}
        resultsPublished={resultsPublished}
      />

      <FilterBar>
        <FilterField label="Search">
          <Input
            className="w-56"
            placeholder="Attendee name"
            defaultValue={search.q ?? ""}
            onChange={(input) => {
              const value = input.target.value.trim();
              setFilter({ q: value === "" ? undefined : value });
            }}
          />
        </FilterField>

        <FilterField label="Status">
        <Select
          items={STATUS_ITEMS}
          value={search.status ?? ALL}
          onValueChange={(value) =>
            setFilter({ status: pick(value, REGISTRATION_STATUSES) })
          }
        >
          <SelectTrigger className="w-full sm:w-40">
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

        <FilterField label="Result">
        <Select
          items={RESULT_ITEMS}
          value={search.result ?? ALL}
          onValueChange={(value) =>
            setFilter({ result: pick(value, RESULT_TYPES) })
          }
        >
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RESULT_ITEMS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        </FilterField>
      </FilterBar>

      <SectionCard
        title="Roster"
        action={
          roster.data ? (
            <Badge variant="outline">{roster.data.total} total</Badge>
          ) : null
        }
        bare
      >
      {roster.isError ? (
        <ErrorState
          className="m-2 border-0 shadow-none"
          error={roster.error}
          onRetry={() => void roster.refetch()}
        />
      ) : roster.isPending ? (
        <div className="flex flex-col gap-2 p-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full" />
          ))}
        </div>
      ) : rows.length > 0 ? (
        <>
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Result</TableHead>
                <TableHead>Registered</TableHead>
                <TableHead className="text-right">Attendance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <RosterRow
                  key={row.id}
                  row={row}
                  canMark={checkinOpen && !resultsPublished}
                  pending={
                    attend.isPending && attend.variables === row.student.userId
                  }
                  onMark={() => attend.mutate(row.student.userId)}
                />
              ))}
            </TableBody>
          </Table>
          </div>

          <Pagination
            page={search.page}
            lastPage={lastPage}
            onChange={(next) =>
              void navigate({ search: (prev) => ({ ...prev, page: next }) })
            }
          />
        </>
      ) : (
        <EmptyState
          icon={UsersIcon}
          title="Nobody on the roster"
          description="Registrations will appear here once students sign up"
        />
      )}
      </SectionCard>
    </PageShell>
  );
}

function Stages({
  status,
  checkinOpen,
  resultsPublished,
}: {
  status: EventDetailDto["status"];
  checkinOpen: boolean;
  resultsPublished: boolean;
}) {
  const stages = [
    { label: "Published", done: status === "published" || resultsPublished },
    { label: "Check-in open", done: checkinOpen },
    { label: "Results published", done: resultsPublished },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {stages.map((stage, index) => (
        <div key={stage.label} className="flex items-center gap-2">
          <Badge variant={stage.done ? "default" : "outline"}>
            {stage.done ? <CheckIcon className="size-3.5" /> : null}
            {stage.label}
          </Badge>
          {index < stages.length - 1 ? (
            <span className="text-muted-foreground">→</span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function RosterRow({
  row,
  canMark,
  pending,
  onMark,
}: {
  row: RegistrationRowDto;
  canMark: boolean;
  pending: boolean;
  onMark: () => void;
}) {
  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-2">
          <Avatar className="size-7">
            {row.student.avatarUrl ? (
              <AvatarImage src={row.student.avatarUrl} alt="" />
            ) : null}
            <AvatarFallback>{initials(row.student.fullName)}</AvatarFallback>
          </Avatar>
          <span className="font-medium">{row.student.fullName}</span>
        </div>
      </TableCell>
      <TableCell>
        <StatusBadge value={row.status} />
      </TableCell>
      <TableCell>{row.result ? labelOf(row.result) : "—"}</TableCell>
      <TableCell className="text-muted-foreground text-sm">
        {format(new Date(row.registeredAt), "d MMM, h:mm a")}
      </TableCell>
      <TableCell className="text-right">
        {row.status === "checked_in" ? (
          <span className="text-muted-foreground text-sm">
            {row.checkedInAt
              ? format(new Date(row.checkedInAt), "h:mm a")
              : "Present"}
          </span>
        ) : row.status === "cancelled" ? (
          <span className="text-muted-foreground text-sm">—</span>
        ) : (
          <Button
            size="sm"
            variant="outline"
            disabled={!canMark || pending}
            onClick={onMark}
          >
            {pending ? "Marking" : "Mark present"}
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}

function PublishResultsDialog({
  slug,
  disabled,
  onDone,
}: {
  slug: string;
  disabled: boolean;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [runnerUps, setRunnerUps] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const attendees = useQuery({
    ...rosterQueryOptions(slug, { status: "checked_in", page: 1, limit: 100 }),
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: () =>
      publishResults(slug, { winnerUserId: winner, runnerUpUserIds: runnerUps }),
    onSuccess: () => {
      onDone();
      setOpen(false);
      toast.add({ title: "Results published", type: "success" });
    },
    onError: (error) => {
      const details = fieldErrorsOf(error);

      if (details.length > 0) {
        setFormError(details.map((detail) => detail.message).join(". "));
        return;
      }

      setFormError(
        isApiError(error) ? error.message : "Could not publish results",
      );
    },
  });

  const rows = attendees.data?.registrations ?? [];
  const winnerItems = [
    { value: "none", label: "No winner" },
    ...rows.map((row) => ({
      value: row.student.userId,
      label: row.student.fullName,
    })),
  ];

  const toggle = (userId: string) => {
    setRunnerUps((previous) =>
      previous.includes(userId)
        ? previous.filter((id) => id !== userId)
        : [...previous, userId],
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button disabled={disabled} />}>
        Publish results
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Publish results</DialogTitle>
          <DialogDescription>
            Only checked-in students can be named. This cannot be undone, and it
            issues certificates.
          </DialogDescription>
        </DialogHeader>

        {attendees.isPending && open ? (
          <Skeleton className="h-32 w-full" />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={UsersIcon}
            title="Nobody checked in"
            description="Mark attendance before publishing results"
          />
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Winner</Label>
              <Select
                items={winnerItems}
                value={winner ?? "none"}
                onValueChange={(value) =>
                  setWinner(value === "none" ? null : String(value))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {winnerItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Runners up</Label>
              <div className="flex max-h-56 flex-col gap-2 overflow-y-auto">
                {rows.map((row) => (
                  <label
                    key={row.id}
                    className="flex items-center gap-2 text-sm"
                  >
                    <Checkbox
                      checked={runnerUps.includes(row.student.userId)}
                      disabled={winner === row.student.userId}
                      onCheckedChange={() => toggle(row.student.userId)}
                    />
                    <span
                      className={
                        winner === row.student.userId
                          ? "text-muted-foreground"
                          : ""
                      }
                    >
                      {row.student.fullName}
                      {winner === row.student.userId ? " (winner)" : ""}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {formError ? (
              <p className="text-destructive text-sm">{formError}</p>
            ) : null}
          </div>
        )}

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button
            disabled={mutation.isPending || rows.length === 0}
            onClick={() => {
              setFormError(null);
              mutation.mutate();
            }}
          >
            {mutation.isPending ? "Publishing" : "Publish"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CancelEventDialog({
  title,
  registered,
  pending,
  onConfirm,
}: {
  title: string;
  registered: number;
  pending: boolean;
  onConfirm: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>
        Cancel event
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cancel {title}?</DialogTitle>
          <DialogDescription>
            {registered === 0
              ? "Nobody is registered yet."
              : `All ${registered} registered students get notified.`}{" "}
            A cancelled event cannot be edited or reopened.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Keep it
          </DialogClose>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() => {
              onConfirm();
              setOpen(false);
            }}
          >
            {pending ? "Cancelling" : "Cancel event"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
