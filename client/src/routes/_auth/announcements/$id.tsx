import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";
import {
  ArrowLeftIcon,
  ClockIcon,
  MegaphoneIcon,
  PencilIcon,
  Trash2Icon,
  TypeIcon,
  UsersIcon,
} from "lucide-react";
import { IconInput } from "@/components/icon-input";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PageShell, SectionCard } from "@/components/dashboard-kit";
import {
  AccentBand,
  HexCrest,
  IconChip,
  MetaChip,
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
        <Skeleton className="h-56 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </PageShell>
    );
  }

  const announcement = data.announcement;
  const edited = announcement.updatedAt !== announcement.createdAt;
  const accent = accentOf(announcement.club.slug);

  return (
    <PageShell size="narrow">
      <Link to="/announcements" className={backLinkClass}>
        <ArrowLeftIcon className="size-4" />
        Back to announcements
      </Link>

      <Card className="gap-0 overflow-hidden py-0">
        <AccentBand accent={accent} className="h-28">
          <div className="absolute inset-x-5 top-4">
            <IconChip icon={MegaphoneIcon} className="size-9" />
          </div>
        </AccentBand>

        <div className="flex flex-wrap items-end justify-between gap-4 px-5 pb-5">
          <div className="min-w-0 flex-1">
            <HexCrest
              name={announcement.club.name}
              className="-mt-12 size-24"
            />

            <h1 className="mt-3 font-heading text-title">
              {announcement.title}
            </h1>

            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
              <MetaChip icon={UsersIcon}>
                <Link
                  to="/clubs/$slug"
                  params={{ slug: announcement.club.slug }}
                  className="hover:text-foreground hover:underline"
                >
                  {announcement.club.name}
                </Link>
              </MetaChip>

              <MetaChip icon={ClockIcon}>
                {format(new Date(announcement.createdAt), "d MMM yyyy, h:mm a")}
                {edited ? " · edited" : ""}
              </MetaChip>

              <span className="inline-flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                <Avatar className="size-4">
                  {announcement.author.avatarUrl ? (
                    <AvatarImage src={announcement.author.avatarUrl} alt="" />
                  ) : null}
                  <AvatarFallback className="text-[8px]">
                    {initials(announcement.author.fullName)}
                  </AvatarFallback>
                </Avatar>
                <Link
                  to="/users/$id"
                  params={{ id: announcement.author.userId }}
                  className="truncate hover:text-foreground hover:underline"
                >
                  {announcement.author.fullName}
                </Link>
              </span>
            </div>
          </div>

          {announcement.canManage ? (
            <div className="flex flex-wrap gap-2">
              <EditDialog announcement={announcement} />
              <DeleteAction announcement={announcement} />
            </div>
          ) : null}
        </div>
      </Card>

      <SectionCard title="Message">
        <p className="px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap">
          {announcement.body}
        </p>
      </SectionCard>
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
