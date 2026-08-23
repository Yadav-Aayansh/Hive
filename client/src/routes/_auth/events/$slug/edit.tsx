import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeftIcon,
  InfoIcon,
  LockIcon,
  TypeIcon,
  UploadIcon,
} from "lucide-react";
import { IconInput } from "@/components/icon-input";
import { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { CategoryField, SharedEventFields } from "@/components/event-fields";
import { useUnsavedGuard } from "@/hooks/use-unsaved-guard";
import { imageProblem } from "@/lib/upload-guard";
import { toIso, toLocalInput, type EventFormValues } from "@/lib/event-form";
import { EmptyState, PageShell } from "@/components/dashboard-kit";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { backLinkClass } from "@/lib/utils";
import { EVENT_CATEGORIES } from "@/lib/constants";
import { isApiError } from "@/lib/errors";
import { applyFieldErrors } from "@/lib/form";
import { membersQueryOptions } from "@/lib/queries/clubs";
import {
  deleteEvent,
  eventKeys,
  eventQueryOptions,
  updateEvent,
  type UpdateEventInput,
} from "@/lib/queries/events";
import { uploadFile } from "@/lib/queries/uploads";

const editEventSchema = z.object({
  clubSlug: z.string(),
  slug: z.string(),
  title: z.string().trim().min(2, "Enter a title").max(160),
  category: z.enum(EVENT_CATEGORIES),
  description: z.string().trim().max(5000),
  venue: z.string().trim().max(160),
  startsAt: z.string(),
  endsAt: z.string(),
  capacity: z.string(),
});

const NONE = "none";

export const Route = createFileRoute("/_auth/events/$slug/edit")({
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(
      eventQueryOptions(params.slug),
    );

    if (!data.event.viewer.manages) {
      throw notFound();
    }

    return data;
  },
  component: EditEventPage,
});

function blank(value: string): string | null {
  return value === "" ? null : value;
}

function EditEventPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [organizer, setOrganizer] = useState<string | null | undefined>(
    undefined,
  );

  const { data } = useQuery(eventQueryOptions(slug));
  const event = data?.event;

  const members = useQuery({
    ...membersQueryOptions(event?.club.slug ?? ""),
    enabled: !!event?.club.slug,
  });

  const form = useForm<EventFormValues>({
    resolver: zodResolver(editEventSchema),
    values: event
      ? {
          clubSlug: event.club.slug,
          slug: event.slug,
          title: event.title,
          category: event.category,
          description: event.description ?? "",
          venue: event.venue ?? "",
          startsAt: toLocalInput(event.startsAt),
          endsAt: toLocalInput(event.endsAt),
          capacity: event.capacity === null ? "" : String(event.capacity),
        }
      : undefined,
  });

  const upload = useMutation({
    mutationFn: (file: File) => uploadFile(file, "event_banner"),
    onSuccess: (result, file) => {
      setUploadId(result.uploadId);
      setPreview(URL.createObjectURL(file));
    },
    onError: (error) => {
      toast.add({
        title: isApiError(error) ? error.message : "Could not upload the banner",
        type: "error",
      });
    },
  });

  const save = useMutation({
    mutationFn: (values: EventFormValues) => {
      const dirty = form.formState.dirtyFields;
      const input: UpdateEventInput = {};

      if (dirty.title) input.title = values.title;
      if (dirty.category) input.category = values.category;
      if (dirty.description) input.description = blank(values.description);
      if (dirty.venue) input.venue = blank(values.venue);
      if (dirty.startsAt) input.startsAt = toIso(values.startsAt);
      if (dirty.endsAt) input.endsAt = toIso(values.endsAt);
      if (dirty.capacity) {
        input.capacity = values.capacity === "" ? null : Number(values.capacity);
      }
      if (organizer !== undefined) input.organizerUserId = organizer;
      if (uploadId) input.bannerUploadId = uploadId;

      return updateEvent(slug, input);
    },
    onSuccess: async ({ event: updated }) => {
      void queryClient.invalidateQueries({ queryKey: eventKeys.all });
      setUploadId(null);
      setPreview(null);
      setOrganizer(undefined);
      toast.add({ title: "Event updated", type: "success" });
      await navigate({ to: "/events/$slug", params: { slug: updated.slug } });
    },
    onError: (error) => {
      if (applyFieldErrors(error, form.setError)) return;
      toast.add({
        title: isApiError(error) ? error.message : "Could not save",
        type: "error",
      });
    },
  });

  const touched = form.formState.isDirty || uploadId !== null;

  useUnsavedGuard(touched && !save.isPending);

  if (!event) {
    return (
      <PageShell size="narrow">
        <Skeleton className="h-96 w-full rounded-2xl" />
      </PageShell>
    );
  }

  const locked = event.status === "cancelled" || event.results !== null;
  const published = event.status === "published";

  if (locked) {
    return (
      <PageShell size="narrow">
        <EmptyState
          icon={LockIcon}
          title="This event can no longer be edited"
          description={
            event.status === "cancelled"
              ? "It was cancelled."
              : "Its results are published, which locks the event."
          }
        >
          <Button
            variant="outline"
            render={<Link to="/events/$slug" params={{ slug }} />}
          >
            Back to the event
          </Button>
        </EmptyState>
      </PageShell>
    );
  }

  const approved = (members.data?.members ?? []).filter(
    (member) => member.status === "approved",
  );
  const organizerItems = [
    { value: NONE, label: "No organizer" },
    ...approved.map((member) => ({
      value: member.userId,
      label: member.fullName,
    })),
  ];
  const organizerValue =
    organizer === undefined
      ? (event.organizer?.userId ?? NONE)
      : (organizer ?? NONE);
  const errors = form.formState.errors;

  return (
    <PageShell size="narrow">
      <Link to="/events/$slug" params={{ slug }} className={backLinkClass}>
        <ArrowLeftIcon className="size-4" />
        Back to {event.title}
      </Link>

      {published ? (
        <div className="bg-muted/50 text-muted-foreground flex gap-2 rounded-lg border p-3 text-sm">
          <InfoIcon className="mt-0.5 size-4 shrink-0" />
          <p>
            This event is published, so people have already registered against
            its schedule. Only the description, venue, banner and organizer can
            still change.
          </p>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Edit event</CardTitle>
          <CardDescription>The URL slug cannot be changed</CardDescription>
        </CardHeader>

        <CardContent>
          <form
            onSubmit={form.handleSubmit((values) => save.mutate(values))}
            noValidate
          >
            <FieldGroup>
              <Field>
                <FieldLabel>Banner</FieldLabel>
                <div className="flex items-center gap-4">
                  {preview ?? event.bannerUrl ? (
                    <img
                      src={preview ?? event.bannerUrl ?? ""}
                      alt=""
                      className="h-16 w-40 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="bg-muted h-16 w-40 rounded-lg" />
                  )}
                  <input
                    ref={fileInput}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(input) => {
                      const file = input.target.files?.[0];
                      if (!file) return;
                      const problem = imageProblem(file);
                      if (problem) {
                        toast.add({ title: problem, type: "error" });
                        return;
                      }
                      upload.mutate(file);
                      input.target.value = "";
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={upload.isPending} loading={upload.isPending}
                    onClick={() => fileInput.current?.click()}
                  >
                    <UploadIcon />
                    {upload.isPending ? "Uploading" : "Replace banner"}
                  </Button>
                </div>
              </Field>

              <Field data-invalid={!!errors.title}>
                <FieldLabel htmlFor="title">Title</FieldLabel>
                <IconInput
                  id="title"
                  icon={TypeIcon}
                  disabled={published}
                  {...form.register("title")}
                />
                {errors.title ? (
                  <FieldError>{errors.title.message}</FieldError>
                ) : null}
              </Field>

              <CategoryField form={form} disabled={published} />

              <Field>
                <FieldLabel htmlFor="organizer">Organizer</FieldLabel>
                <Controller
                  control={form.control}
                  name="clubSlug"
                  render={() => (
                    <Select
                      items={organizerItems}
                      value={organizerValue}
                      onValueChange={(value) =>
                        setOrganizer(value === NONE ? null : String(value))
                      }
                    >
                      <SelectTrigger id="organizer">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {organizerItems.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldDescription>
                  Shares every manage action with you. Must be an approved club
                  member.
                </FieldDescription>
              </Field>

              <SharedEventFields form={form} lockScheduling={published} />

              <Field>
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" disabled={save.isPending || !touched} loading={save.isPending}>
                    {save.isPending ? "Saving" : "Save changes"}
                  </Button>
                  {event.status === "draft" ? (
                    <DeleteDraftDialog slug={slug} title={event.title} />
                  ) : null}
                </div>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </PageShell>
  );
}

function DeleteDraftDialog({ slug, title }: { slug: string; title: string }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => deleteEvent(slug),
    onSuccess: async () => {
      void queryClient.invalidateQueries({ queryKey: eventKeys.all });
      setOpen(false);
      toast.add({ title: "Draft deleted", type: "success" });
      await navigate({ to: "/events", replace: true });
    },
    onError: (error) => {
      toast.add({
        title: isApiError(error) ? error.message : "Could not delete",
        type: "error",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" type="button" />}>
        Delete draft
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete this draft?</DialogTitle>
          <DialogDescription>
            {title} will be removed. Only drafts can be deleted, so this cannot
            be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button
            variant="destructive"
            disabled={mutation.isPending} loading={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Deleting" : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
