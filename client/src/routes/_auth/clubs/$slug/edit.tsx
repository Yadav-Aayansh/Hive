import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeftIcon,
  UploadIcon,
  UsersIcon,
} from "lucide-react";
import { IconInput } from "@/components/icon-input";
import { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { PageShell } from "@/components/dashboard-kit";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { useUnsavedGuard } from "@/hooks/use-unsaved-guard";
import { imageProblem } from "@/lib/upload-guard";
import { CLUB_CATEGORIES } from "@/lib/constants";
import { labelOf } from "@/lib/labels";
import { backLinkClass } from "@/lib/utils";
import { isApiError } from "@/lib/errors";
import { applyFieldErrors } from "@/lib/form";
import {
  clubKeys,
  clubQueryOptions,
  updateClub,
  type UpdateClubInput,
} from "@/lib/queries/clubs";
import { uploadFile } from "@/lib/queries/uploads";

const editClubSchema = z.object({
  name: z.string().trim().min(2, "Enter a club name").max(120),
  category: z.enum(CLUB_CATEGORIES),
  description: z.string().trim().max(2000),
});

type EditClubValues = z.infer<typeof editClubSchema>;

const CATEGORY_ITEMS = CLUB_CATEGORIES.map((value) => ({
  value,
  label: labelOf(value),
}));

export const Route = createFileRoute("/_auth/clubs/$slug/edit")({
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(
      clubQueryOptions(params.slug),
    );

    if (
      data.club.viewer?.role !== "leader" ||
      data.club.viewer.status !== "approved"
    ) {
      throw notFound();
    }

    return data;
  },
  component: EditClubPage,
});

function initials(name?: string): string {
  if (!name) return "";
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}

function EditClubPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploadId, setUploadId] = useState<string | null>(null);

  const { data } = useQuery(clubQueryOptions(slug));
  const club = data?.club;

  const form = useForm<EditClubValues>({
    resolver: zodResolver(editClubSchema),
    values: club
      ? {
          name: club.name,
          category: club.category,
          description: club.description ?? "",
        }
      : undefined,
  });

  const upload = useMutation({
    mutationFn: (file: File) => uploadFile(file, "club_logo"),
    onSuccess: (result, file) => {
      setUploadId(result.uploadId);
      setPreview(URL.createObjectURL(file));
    },
    onError: (error) => {
      toast.add({
        title: isApiError(error) ? error.message : "Could not upload the logo",
        type: "error",
      });
    },
  });

  const save = useMutation({
    mutationFn: (values: EditClubValues) => {
      const dirty = form.formState.dirtyFields;
      const input: UpdateClubInput = {};

      if (dirty.name) input.name = values.name;
      if (dirty.category) input.category = values.category;
      if (dirty.description) {
        input.description = values.description === "" ? null : values.description;
      }
      if (uploadId) input.logoUploadId = uploadId;

      return updateClub(slug, input);
    },
    onSuccess: async () => {
      void queryClient.invalidateQueries({ queryKey: clubKeys.all });
      setUploadId(null);
      setPreview(null);
      toast.add({ title: "Club updated", type: "success" });
      await navigate({ to: "/clubs/$slug", params: { slug } });
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

  if (!club) {
    return (
      <PageShell size="narrow">
        <Skeleton className="h-80 w-full rounded-2xl" />
      </PageShell>
    );
  }

  const errors = form.formState.errors;
  const logoUrl = preview ?? club.logoUrl;

  return (
    <PageShell size="narrow">
      <Link to="/clubs/$slug" params={{ slug }} className={backLinkClass}>
        <ArrowLeftIcon className="size-4" />
        Back to {club.name}
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Edit club</CardTitle>
          <CardDescription>
            The slug and type cannot change once the club exists
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form
            onSubmit={form.handleSubmit((values) => save.mutate(values))}
            noValidate
          >
            <FieldGroup>
              <Field>
                <FieldLabel>Logo</FieldLabel>
                <div className="flex items-center gap-4">
                  <Avatar className="size-14 rounded-lg">
                    {logoUrl ? <AvatarImage src={logoUrl} alt="" /> : null}
                    <AvatarFallback className="rounded-lg">
                      {initials(club.name)}
                    </AvatarFallback>
                  </Avatar>
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
                    {upload.isPending ? "Uploading" : "Replace logo"}
                  </Button>
                </div>
              </Field>

              <Field data-invalid={!!errors.name}>
                <FieldLabel htmlFor="name">Name</FieldLabel>
                <IconInput id="name" icon={UsersIcon} {...form.register("name")} />
                {errors.name ? (
                  <FieldError>{errors.name.message}</FieldError>
                ) : null}
              </Field>

              <Field data-invalid={!!errors.category}>
                <FieldLabel htmlFor="category">Category</FieldLabel>
                <Controller
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <Select
                      items={CATEGORY_ITEMS}
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger id="category">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORY_ITEMS.map((item) => (
                          <SelectItem
                            key={item.value}
                            value={item.value}
                          >
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.category ? (
                  <FieldError>{errors.category.message}</FieldError>
                ) : null}
              </Field>

              <Field data-invalid={!!errors.description}>
                <FieldLabel htmlFor="description">Description</FieldLabel>
                <Textarea
                  id="description"
                  rows={4}
                  {...form.register("description")}
                />
                <FieldDescription>Leave empty to clear it</FieldDescription>
                {errors.description ? (
                  <FieldError>{errors.description.message}</FieldError>
                ) : null}
              </Field>

              <Field>
                <Button type="submit" disabled={save.isPending || !touched} loading={save.isPending}>
                  {save.isPending ? "Saving" : "Save changes"}
                </Button>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </PageShell>
  );
}
