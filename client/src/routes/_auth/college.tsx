import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, notFound } from "@tanstack/react-router";
import {
  BuildingIcon,
  UploadIcon,
} from "lucide-react";
import { IconInput } from "@/components/icon-input";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { PageHeader, PageShell, SectionCard } from "@/components/dashboard-kit";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { useUnsavedGuard } from "@/hooks/use-unsaved-guard";
import { imageProblem } from "@/lib/upload-guard";
import { isApiError } from "@/lib/errors";
import { useMe } from "@/lib/queries/me";
import { applyFieldErrors } from "@/lib/form";
import {
  collegeQueryOptions,
  updateCollege,
  type UpdateCollegeInput,
} from "@/lib/queries/colleges";
import { uploadFile } from "@/lib/queries/uploads";

const collegeSchema = z.object({
  name: z.string().trim().max(160),
  description: z.string().trim().max(2000),
});

type CollegeValues = z.infer<typeof collegeSchema>;

export const Route = createFileRoute("/_auth/college")({
  head: () => ({ meta: [{ title: "College settings · Hive" }] }),
  beforeLoad: ({ context }) => {
    if (context.user.role !== "campus_admin") {
      throw notFound();
    }
  },
  component: CollegePage,
});

function CollegePage() {
  const user = useMe();
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploadId, setUploadId] = useState<string | null>(null);
  const slug = user.collegeSlug ?? "";

  const college = useQuery(collegeQueryOptions(slug));

  const form = useForm<CollegeValues>({
    resolver: zodResolver(collegeSchema),
    values: {
      name: college.data?.name ?? "",
      description: college.data?.description ?? "",
    },
  });

  const upload = useMutation({
    mutationFn: (file: File) => uploadFile(file, "college_logo"),
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
    mutationFn: (values: CollegeValues) => {
      const dirty = form.formState.dirtyFields;
      const input: UpdateCollegeInput = {};

      if (dirty.name && values.name) input.name = values.name;
      if (dirty.description) {
        input.description = values.description === "" ? null : values.description;
      }
      if (uploadId) input.logoUploadId = uploadId;

      return updateCollege(slug, input);
    },
    onSuccess: () => {
      setUploadId(null);
      setPreview(null);
      void queryClient.invalidateQueries({ queryKey: ["colleges"] });
      toast.add({ title: "College updated", type: "success" });
    },
    onError: (error) => {
      if (applyFieldErrors(error, form.setError)) return;
      toast.add({
        title: isApiError(error) ? error.message : "Could not save",
        type: "error",
      });
    },
  });

  const errors = form.formState.errors;

  const touched = form.formState.isDirty || uploadId !== null;

  useUnsavedGuard(touched && !save.isPending);
  const logoUrl = preview ?? college.data?.logoUrl ?? null;

  return (
    <PageShell size="narrow">
      <PageHeader title="College settings" />

      <SectionCard
        title="Details"
        description="The slug and email domain are fixed once the college exists"
      >
        <div className="px-3 py-2">
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
                      {slug.slice(0, 2).toUpperCase()}
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
                <IconInput id="name" icon={BuildingIcon} {...form.register("name")} />
                <FieldDescription>Leave empty to keep it</FieldDescription>
                {errors.name ? (
                  <FieldError>{errors.name.message}</FieldError>
                ) : null}
              </Field>

              <Field data-invalid={!!errors.description}>
                <FieldLabel htmlFor="description">Description</FieldLabel>
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
                <Button
                  type="submit"
                  disabled={save.isPending || !touched}
                >
                  {save.isPending ? "Saving" : "Save changes"}
                </Button>
              </Field>
            </FieldGroup>
          </form>
        </div>
      </SectionCard>
    </PageShell>
  );
}
