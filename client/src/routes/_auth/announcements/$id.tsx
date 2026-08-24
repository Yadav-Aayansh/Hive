import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";
import {
  ArrowLeftIcon,
  PencilIcon,
  Trash2Icon,
  TypeIcon,
} from "lucide-react";
import { IconInput } from "@/components/icon-input";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PageShell } from "@/components/dashboard-kit";
import {
  AccentRail,
  HexCrest,
} from "@/components/entity-kit";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { accentOf } from "@/lib/category";
import { isApiError } from "@/lib/errors";
import { applyFieldErrors } from "@/lib/form";
import {
  announcementKeys,
  announcementQueryOptions,
  deleteAnnouncement,
  updateAnnouncement,
  type AnnouncementDto,
} from "@/lib/queries/announcements";
import { backLinkClass, initials } from "@/lib/utils";

export const Route = createFileRoute("/_auth/announcements/$id")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(announcementQueryOptions(params.id)),
  component: AnnouncementDetailPage,
});

function AnnouncementDetailPage() {
  const { id } = Route.useParams();
  const { data } = useQuery(announcementQueryOptions(id));

  if (!data) {
    return (
      <PageShell size="narrow">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </PageShell>
    );
  }

  const announcement = data.announcement;
  const accent = accentOf(announcement.club.slug);
  const edited = announcement.updatedAt !== announcement.createdAt;

  return (
    <PageShell size="narrow">
      <Link to="/announcements" className={backLinkClass}>
        <ArrowLeftIcon className="size-4" />
        Back to announcements
      </Link>

      <Card className="relative gap-0 py-0">
        <AccentRail accent={accent} />

        <div className="flex flex-col gap-4 py-6 pr-6 pl-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <HexCrest name={announcement.club.name} className="size-11" />
              <div className="min-w-0">
                <Link
                  to="/clubs/$slug"
                  params={{ slug: announcement.club.slug }}
                  className="text-sm font-medium hover:underline"
                >
                  {announcement.club.name}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {format(
                    new Date(announcement.createdAt),
                    "d MMM yyyy, h:mm a",
                  )}
                  {edited ? " · edited" : ""}
                </p>
              </div>
            </div>

            {announcement.canManage ? (
              <div className="flex gap-2">
                <EditDialog announcement={announcement} />
                <DeleteAction announcement={announcement} />
              </div>
            ) : null}
          </div>

          <h1 className="font-heading text-title">
            {announcement.title}
          </h1>

          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {announcement.body}
          </p>

          <div className="flex items-center gap-3 border-t pt-4">
            <Avatar className="size-9">
              {announcement.author.avatarUrl ? (
                <AvatarImage src={announcement.author.avatarUrl} alt="" />
              ) : null}
              <AvatarFallback>
                {initials(announcement.author.fullName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <Link
                to="/users/$id"
                params={{ id: announcement.author.userId }}
                className="text-sm font-medium hover:underline"
              >
                {announcement.author.fullName}
              </Link>
              <p className="text-xs text-muted-foreground">
                Posted this to the club wall
              </p>
            </div>
          </div>
        </div>
      </Card>
    </PageShell>
  );
}

const editSchema = z.object({
  title: z.string().trim().min(2, "Give it a title").max(160),
  body: z.string().trim().min(1, "Write something").max(5000),
});

type EditValues = z.infer<typeof editSchema>;

function EditDialog({ announcement }: { announcement: AnnouncementDto }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: { title: announcement.title, body: announcement.body },
  });

  const mutation = useMutation({
    mutationFn: (values: EditValues) =>
      updateAnnouncement(announcement.id, values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: announcementKeys.all });
      setOpen(false);
      toast.add({ title: "Announcement updated", type: "success" });
    },
    onError: (error) => {
      if (applyFieldErrors(error, form.setError)) return;
      toast.add({
        title: isApiError(error) ? error.message : "Could not update",
        type: "error",
      });
    },
  });

  const errors = form.formState.errors;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <PencilIcon />
        Edit
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form
          onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
          noValidate
        >
          <DialogHeader>
            <DialogTitle>Edit announcement</DialogTitle>
            <DialogDescription>
              Editing does not send a new notification
            </DialogDescription>
          </DialogHeader>

          <FieldGroup className="py-4">
            <Field data-invalid={!!errors.title}>
              <FieldLabel htmlFor="edit-title">Title</FieldLabel>
              <IconInput id="edit-title" icon={TypeIcon} {...form.register("title")} />
              {errors.title ? (
                <FieldError>{errors.title.message}</FieldError>
              ) : null}
            </Field>

            <Field data-invalid={!!errors.body}>
              <FieldLabel htmlFor="edit-body">Message</FieldLabel>
              <Textarea id="edit-body" rows={6} {...form.register("body")} />
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
              {mutation.isPending ? "Saving" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteAction({ announcement }: { announcement: AnnouncementDto }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => deleteAnnouncement(announcement.id),
    onSuccess: async () => {
      void queryClient.invalidateQueries({ queryKey: announcementKeys.all });
      toast.add({ title: "Announcement deleted", type: "success" });
      await navigate({ to: "/announcements", replace: true });
    },
    onError: (error) => {
      toast.add({
        title: isApiError(error) ? error.message : "Could not delete",
        type: "error",
      });
    },
  });

  return (
    <ConfirmDialog
      trigger={<Button variant="outline" size="sm" />}
      triggerLabel={
        <>
          <Trash2Icon />
          Delete
        </>
      }
      title="Delete this announcement?"
      description={`${announcement.title} will be removed for everyone, along with the notifications that point at it. This cannot be undone.`}
      confirmLabel="Delete post"
      destructive
      pending={mutation.isPending}
      onConfirm={() => mutation.mutate()}
    />
  );
}
