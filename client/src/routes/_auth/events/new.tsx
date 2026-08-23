import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeftIcon,
  LinkIcon,
  TypeIcon,
  UploadIcon,
  UsersIcon,
} from "lucide-react";
import { IconInput } from "@/components/icon-input";
import { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { CategoryField, SharedEventFields } from "@/components/event-fields";
import { useUnsavedGuard } from "@/hooks/use-unsaved-guard";
import { imageProblem } from "@/lib/upload-guard";
import { toIso, type EventFormValues } from "@/lib/event-form";
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
import { clubsQueryOptions } from "@/lib/queries/clubs";
import { createEvent, eventKeys } from "@/lib/queries/events";
import { uploadFile } from "@/lib/queries/uploads";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const newEventSchema = z.object({
  clubSlug: z.string().min(1, "Pick a club"),
  title: z.string().trim().min(2, "Enter a title").max(160),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, "At least 2 characters")
    .max(120)
    .regex(SLUG_PATTERN, "Use lowercase letters, numbers and hyphens"),
  category: z.enum(EVENT_CATEGORIES),
  description: z.string().trim().max(5000),
  venue: z.string().trim().max(160),
  startsAt: z.string(),
  endsAt: z.string(),
  capacity: z.string(),
});

type NewEventValues = EventFormValues;

export const Route = createFileRoute("/_auth/events/new")({
  head: () => ({ meta: [{ title: "New event · Hive" }] }),
  component: NewEventPage,
});

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function NewEventPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);

  const clubs = useQuery(clubsQueryOptions({ mine: true, sort: "name", page: 1 }));
  const led = (clubs.data?.clubs ?? []).filter(
    (club) =>
      club.viewer?.role === "leader" &&
      club.viewer.status === "approved" &&
      club.status === "approved",
  );

  const form = useForm<NewEventValues>({
    resolver: zodResolver(newEventSchema),
    defaultValues: {
      clubSlug: "",
      title: "",
      slug: "",
      category: "workshop",
      description: "",
      venue: "",
      startsAt: "",
      endsAt: "",
      capacity: "",
    },
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

  const create = useMutation({
    mutationFn: (values: NewEventValues) => {
      const startsAt = toIso(values.startsAt);
      const endsAt = toIso(values.endsAt);

      return createEvent({
        clubSlug: values.clubSlug,
        title: values.title,
        slug: values.slug,
        category: values.category,
        ...(values.description ? { description: values.description } : {}),
        ...(values.venue ? { venue: values.venue } : {}),
        ...(startsAt ? { startsAt } : {}),
        ...(endsAt ? { endsAt } : {}),
        ...(values.capacity ? { capacity: Number(values.capacity) } : {}),
        ...(uploadId ? { bannerUploadId: uploadId } : {}),
      });
    },
    onSuccess: async ({ event }) => {
      void queryClient.invalidateQueries({ queryKey: eventKeys.all });
      toast.add({ title: "Event created as a draft", type: "success" });
      await navigate({ to: "/events/$slug", params: { slug: event.slug } });
    },
    onError: (error) => {
      if (applyFieldErrors(error, form.setError)) return;
      toast.add({
        title: isApiError(error) ? error.message : "Could not create the event",
        type: "error",
      });
    },
  });

  const touched = form.formState.isDirty || uploadId !== null;

  useUnsavedGuard(touched && !create.isPending);

  if (clubs.isPending) {
    return (
      <PageShell size="narrow">
        <Skeleton className="h-96 w-full rounded-2xl" />
      </PageShell>
    );
  }

  if (led.length === 0) {
    return (
      <PageShell size="narrow">
        <EmptyState
          icon={UsersIcon}
          title="You do not lead an approved club"
          description="Only the leader of an approved club can create events"
        >
          <Button variant="outline" render={<Link to="/clubs" />}>
            Back to clubs
          </Button>
        </EmptyState>
      </PageShell>
    );
  }

  const clubItems = led.map((club) => ({
    value: club.slug,
    label: club.name,
  }));
  const errors = form.formState.errors;

  return (
    <PageShell size="narrow">
      <Link to="/events" className={backLinkClass}>
        <ArrowLeftIcon className="size-4" />
        Back to events
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Create an event</CardTitle>
          <CardDescription>
            It starts as a draft. Publish it when you are ready and club members
            get notified.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form
            onSubmit={form.handleSubmit((values) => create.mutate(values))}
            noValidate
          >
            <FieldGroup>
              <Field>
                <FieldLabel>Banner</FieldLabel>
                <div className="flex items-center gap-4">
                  {preview ? (
                    <img
                      src={preview}
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
                    {upload.isPending ? "Uploading" : "Choose banner"}
                  </Button>
                </div>
              </Field>

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
                        <SelectValue placeholder="Pick a club" />
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
                <IconInput
                  id="title"
                  icon={TypeIcon}
                  {...form.register("title", {
                    onChange: (
                      input: React.ChangeEvent<HTMLInputElement>,
                    ) => {
                      if (!slugTouched) {
                        form.setValue("slug", slugify(input.target.value));
                      }
                    },
                  })}
                />
                {errors.title ? (
                  <FieldError>{errors.title.message}</FieldError>
                ) : null}
              </Field>

              <Field data-invalid={!!errors.slug}>
                <FieldLabel htmlFor="slug">URL slug</FieldLabel>
                <IconInput
                  id="slug"
                  icon={LinkIcon}
                  {...form.register("slug", {
                    onChange: () => setSlugTouched(true),
                  })}
                />
                <FieldDescription>Unique within your college</FieldDescription>
                {errors.slug ? (
                  <FieldError>{errors.slug.message}</FieldError>
                ) : null}
              </Field>

              <CategoryField form={form} />
              <SharedEventFields form={form} />

              <Field>
                <Button type="submit" disabled={create.isPending || !touched} loading={create.isPending}>
                  {create.isPending ? "Creating" : "Create draft"}
                </Button>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </PageShell>
  );
}
