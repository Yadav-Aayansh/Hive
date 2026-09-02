import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  format,
  formatDistanceToNow,
  isToday,
  isYesterday,
} from "date-fns";
import {
  ArrowRightIcon,
  CalendarDaysIcon,
  MegaphoneIcon,
  PlusIcon,
  TypeIcon,
} from "lucide-react";
import { IconInput } from "@/components/icon-input";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import {
  EmptyState,
  ErrorState,
  FilterBar,
  FilterField,
  PageHeader,
  PageShell,
  Pagination,
  SearchField,
} from "@/components/dashboard-kit";
import {
  GroupHeading,
  HexCrest,
} from "@/components/entity-kit";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { isApiError } from "@/lib/errors";
import { applyFieldErrors } from "@/lib/form";
import {
  announcementKeys,
  announcementsQueryOptions,
  createAnnouncement,
  type AnnouncementDto,
} from "@/lib/queries/announcements";
import { clubsQueryOptions, type ClubDto } from "@/lib/queries/clubs";
import { useMe } from "@/lib/queries/me";
import { stretchedLinkClass } from "@/lib/utils";

const ALL = "all";

const announcementSearchSchema = z.object({
  search: z.string().trim().min(1).max(160).optional(),
  club: z.string().trim().min(2).max(60).optional(),
  page: z.coerce.number().int().min(1).default(1),
});

export const Route = createFileRoute("/_auth/announcements/")({
  head: () => ({ meta: [{ title: "Announcements · Hive" }] }),
  validateSearch: announcementSearchSchema,
  component: AnnouncementsPage,
});

function useAudienceClubs(role: "campus_admin" | "student") {
  return useQuery(
    clubsQueryOptions(
      role === "campus_admin"
        ? { type: "official", status: "approved", sort: "name", page: 1 }
        : { mine: true, sort: "name", page: 1 },
    ),
  );
}

function dayLabel(date: Date): string {
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "EEEE d MMMM");
}

function groupByDay(announcements: AnnouncementDto[]) {
  const groups: { key: string; label: string; items: AnnouncementDto[] }[] = [];

  for (const announcement of announcements) {
    const date = new Date(announcement.createdAt);
    const key = format(date, "yyyy-MM-dd");
    const last = groups[groups.length - 1];

    if (last && last.key === key) {
      last.items.push(announcement);
    } else {
      groups.push({ key, label: dayLabel(date), items: [announcement] });
    }
  }

  return groups;
}

function AnnouncementCard({
  announcement,
}: {
  announcement: AnnouncementDto;
}) {
  return (
    <Card className="group/post relative flex flex-col gap-4 p-5 transition-shadow hover:shadow-lg">
      <div className="flex items-center gap-3">
        <HexCrest name={announcement.club.name} className="size-10" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            {announcement.club.name}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {announcement.author.fullName} ·{" "}
            {formatDistanceToNow(new Date(announcement.createdAt), {
              addSuffix: true,
            })}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <h3 className="font-heading text-lg font-semibold text-foreground">
          {announcement.title}
        </h3>
        <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
          {announcement.body}
        </p>
      </div>

      <div className="mt-1 inline-flex w-fit items-center gap-1 text-xs font-medium text-primary transition-transform group-hover/post:translate-x-0.5">
        Read announcement
        <ArrowRightIcon className="size-3.5" />
      </div>

      <Link
        to="/announcements/$id"
        params={{ id: announcement.id }}
        className={stretchedLinkClass}
      >
        <span className="sr-only">Open {announcement.title}</span>
      </Link>
    </Card>
  );
}

function AnnouncementsPage() {
  const user = useMe();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  const { data, isPending, isError, error, refetch } = useQuery(
    announcementsQueryOptions(search),
  );
  const audience = useAudienceClubs(user.role);

  const clubs = audience.data?.clubs ?? [];
  const led = clubs.filter(
    (club) =>
      club.viewer?.role === "leader" && club.viewer.status === "approved",
  );

  const clubOptions = [
    { value: ALL, label: "All clubs" },
    ...clubs.map((club) => ({ value: club.slug, label: club.name })),
  ];

  const rows = data?.announcements ?? [];
  const groups = groupByDay(rows);
  const lastPage = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  const setFilter = (patch: { search?: string; club?: string }) => {
    void navigate({
      search: (prev) => ({ ...prev, ...patch, page: 1 }),
      resetScroll: false,
    });
  };

  return (
    <PageShell size="narrow">
      <PageHeader title="Announcements">
        {led.length > 0 ? <ComposeDialog clubs={led} /> : null}
      </PageHeader>

      <FilterBar>
        <FilterField label="Search" className="grow">
          <SearchField
            className="w-full sm:min-w-52"
            placeholder="Title or message"
            defaultValue={search.search}
            onSearch={(value) => setFilter({ search: value })}
          />
        </FilterField>

        {clubs.length > 0 ? (
          <FilterField label="Club">
            <Select
              items={clubOptions}
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
                {clubOptions.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>
        ) : null}
      </FilterBar>

      {isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : isPending ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-40 w-full rounded-2xl" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <Card className="gap-0 py-0">
          <EmptyState
            icon={MegaphoneIcon}
            title="Nothing on the wall yet"
            description="Posts from the clubs you have joined land here. Join a club to start seeing them."
          >
            <Button variant="outline" render={<Link to="/clubs" />}>
              Browse clubs
            </Button>
          </EmptyState>
        </Card>
      ) : (
        <>
          {groups.map((group) => (
            <section key={group.key} className="flex flex-col gap-3">
              <GroupHeading
                icon={CalendarDaysIcon}
                title={group.label}
                count={group.items.length}
              />
              {group.items.map((announcement) => (
                <AnnouncementCard
                  key={announcement.id}
                  announcement={announcement}
                />
              ))}
            </section>
          ))}

          {lastPage > 1 ? (
            <Card className="gap-0 py-0">
              <Pagination
                flat
                page={search.page}
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
    </PageShell>
  );
}

const composeSchema = z.object({
  clubSlug: z.string().min(1, "Pick a club"),
  title: z.string().trim().min(2, "Give it a title").max(160),
  body: z.string().trim().min(1, "Write something").max(5000),
});

type ComposeValues = z.infer<typeof composeSchema>;

function ComposeDialog({ clubs }: { clubs: ClubDto[] }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<ComposeValues>({
    resolver: zodResolver(composeSchema),
    defaultValues: { clubSlug: clubs[0]?.slug ?? "", title: "", body: "" },
  });

  const mutation = useMutation({
    mutationFn: createAnnouncement,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: announcementKeys.all });
      setOpen(false);
      form.reset({ clubSlug: clubs[0]?.slug ?? "", title: "", body: "" });
      toast.add({ title: "Announcement posted", type: "success" });
    },
    onError: (error) => {
      if (applyFieldErrors(error, form.setError)) return;
      toast.add({
        title: isApiError(error) ? error.message : "Could not post",
        type: "error",
      });
    },
  });

  const clubItems = clubs.map((club) => ({
    value: club.slug,
    label: club.name,
  }));
  const errors = form.formState.errors;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <PlusIcon />
        New announcement
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form
          onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
          noValidate
        >
          <DialogHeader>
            <DialogTitle>New announcement</DialogTitle>
            <DialogDescription>
              Everyone approved in the club gets notified
            </DialogDescription>
          </DialogHeader>

          <FieldGroup className="py-4">
            <Field data-invalid={!!errors.clubSlug}>
              <FieldLabel htmlFor="clubSlug">Club</FieldLabel>
              <Controller
                control={form.control}
                name="clubSlug"
                render={({ field }) => (
                  <Select
                    items={clubItems}
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger id="clubSlug">
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
                )}
              />
              {errors.clubSlug ? (
                <FieldError>{errors.clubSlug.message}</FieldError>
              ) : null}
            </Field>

            <Field data-invalid={!!errors.title}>
              <FieldLabel htmlFor="title">Title</FieldLabel>
              <IconInput id="title" icon={TypeIcon} {...form.register("title")} />
              {errors.title ? (
                <FieldError>{errors.title.message}</FieldError>
              ) : null}
            </Field>

            <Field data-invalid={!!errors.body}>
              <FieldLabel htmlFor="body">Message</FieldLabel>
              <Textarea id="body" rows={6} {...form.register("body")} />
              {errors.body ? (
                <FieldError>{errors.body.message}</FieldError>
              ) : null}
            </Field>
          </FieldGroup>

          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>
              Cancel
            </DialogClose>
            <Button type="submit" disabled={mutation.isPending} loading={mutation.isPending}>
              {mutation.isPending ? "Posting" : "Post"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
