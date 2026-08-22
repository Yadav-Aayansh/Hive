import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeftIcon,
  LinkIcon,
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { useUnsavedGuard } from "@/hooks/use-unsaved-guard";
import { imageProblem } from "@/lib/upload-guard";
import { CLUB_CATEGORIES, CLUB_TYPES } from "@/lib/constants";
import { labelOf } from "@/lib/labels";
import { backLinkClass } from "@/lib/utils";
import { isApiError } from "@/lib/errors";
import { applyFieldErrors } from "@/lib/form";
import { clubKeys, createClub } from "@/lib/queries/clubs";
import { uploadFile } from "@/lib/queries/uploads";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const createClubSchema = z.object({
  name: z.string().trim().min(2, "Enter a club name").max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, "At least 2 characters")
    .max(60)
    .regex(SLUG_PATTERN, "Use lowercase letters, numbers and hyphens"),
  category: z.enum(CLUB_CATEGORIES),
  type: z.enum(CLUB_TYPES),
  description: z.string().trim().max(2000),
});

type CreateClubValues = z.infer<typeof createClubSchema>;

const CATEGORY_ITEMS = CLUB_CATEGORIES.map((value) => ({
  value,
  label: labelOf(value),
}));

const TYPE_ITEMS = [
  { value: "unofficial", label: "Unofficial" },
  { value: "official", label: "Official" },
];

export const Route = createFileRoute("/_auth/clubs/new")({
  head: () => ({ meta: [{ title: "New club · Hive" }] }),
  component: NewClubPage,
});

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function NewClubPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [name, setName] = useState("");

  const form = useForm<CreateClubValues>({
    resolver: zodResolver(createClubSchema),
    defaultValues: {
      name: "",
      slug: "",
      category: "technical",
      type: "unofficial",
      description: "",
    },
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

  const create = useMutation({
    mutationFn: (values: CreateClubValues) =>
      createClub({
        name: values.name,
        slug: values.slug,
        category: values.category,
        type: values.type,
        ...(values.description ? { description: values.description } : {}),
        ...(uploadId ? { logoUploadId: uploadId } : {}),
      }),
    onSuccess: async ({ club }) => {
      void queryClient.invalidateQueries({ queryKey: clubKeys.all });
      toast.add({
        title:
          club.status === "pending"
            ? "Club created, waiting for admin approval"
            : "Club created",
        type: "success",
      });
      await navigate({ to: "/clubs/$slug", params: { slug: club.slug } });
    },
    onError: (error) => {
      if (applyFieldErrors(error, form.setError)) return;
      toast.add({
        title: isApiError(error) ? error.message : "Could not create the club",
        type: "error",
      });
    },
  });

  const errors = form.formState.errors;

  const touched = form.formState.isDirty || uploadId !== null;

  useUnsavedGuard(touched && !create.isPending);

  return (
    <PageShell size="narrow">
      <Link to="/clubs" className={backLinkClass}>
        <ArrowLeftIcon className="size-4" />
        Back to clubs
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Start a club</CardTitle>
          <CardDescription>
            You become its leader. Unofficial clubs open immediately. Official
            clubs wait for a campus admin, and only they can issue certificates.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form
            onSubmit={form.handleSubmit((values) => create.mutate(values))}
            noValidate
          >
            <FieldGroup>
              <Field>
                <FieldLabel>Logo</FieldLabel>
                <div className="flex items-center gap-4">
                  <Avatar className="size-14 rounded-lg">
                    {preview ? <AvatarImage src={preview} alt="" /> : null}
                    <AvatarFallback className="rounded-lg">
                      {(name || "C").slice(0, 2).toUpperCase()}
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
                    {upload.isPending ? "Uploading" : "Choose logo"}
                  </Button>
                </div>
              </Field>

              <Field data-invalid={!!errors.name}>
                <FieldLabel htmlFor="name">Name</FieldLabel>
                <IconInput
                  id="name"
                  icon={UsersIcon}
                  placeholder="Robotics and Automation Club"
                  {...form.register("name", {
                    onChange: (
                      input: React.ChangeEvent<HTMLInputElement>,
                    ) => {
                      setName(input.target.value);
                      if (!slugTouched) {
                        form.setValue("slug", slugify(input.target.value));
                      }
                    },
                  })}
                />
                {errors.name ? (
                  <FieldError>{errors.name.message}</FieldError>
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
                <FieldDescription>
                  Must be unique in your college
                </FieldDescription>
                {errors.slug ? (
                  <FieldError>{errors.slug.message}</FieldError>
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
                          <SelectItem key={item.value} value={item.value}>
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

              <Field data-invalid={!!errors.type}>
                <FieldLabel htmlFor="type">Type</FieldLabel>
                <Controller
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <Select
                      items={TYPE_ITEMS}
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger id="type">
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
                  )}
                />
                <FieldDescription>
                  Official clubs need approval but can issue certificates for
                  their events
                </FieldDescription>
                {errors.type ? (
                  <FieldError>{errors.type.message}</FieldError>
                ) : null}
              </Field>

              <Field data-invalid={!!errors.description}>
                <FieldLabel htmlFor="description">
                  Description (optional)
                </FieldLabel>
                <Textarea
                  id="description"
                  rows={4}
                  {...form.register("description")}
                />
                {errors.description ? (
                  <FieldError>{errors.description.message}</FieldError>
                ) : null}
              </Field>

              <Field>
                <Button type="submit" disabled={create.isPending || !touched} loading={create.isPending}>
                  {create.isPending ? "Creating" : "Create club"}
                </Button>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </PageShell>
  );
}
