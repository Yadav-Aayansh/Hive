import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import {
  AtSignIcon,
  BuildingIcon,
  LinkIcon,
  UploadIcon,
} from "lucide-react";
import { IconInput } from "@/components/icon-input";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { HiveMark } from "@/components/hive-mark";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { imageProblem } from "@/lib/upload-guard";
import { isApiError } from "@/lib/errors";
import { applyFieldErrors } from "@/lib/form";
import { onboardCollege } from "@/lib/queries/colleges";
import { isOnboarded, meQueryKey, meQueryOptions } from "@/lib/queries/me";
import { uploadFile } from "@/lib/queries/uploads";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const onboardingSchema = z.object({
  name: z.string().trim().min(2, "Enter the college name").max(160),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, "At least 2 characters")
    .max(60)
    .regex(SLUG_PATTERN, "Use lowercase letters, numbers and hyphens"),
  description: z.string().trim().max(2000),
});

type OnboardingValues = z.infer<typeof onboardingSchema>;

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Set up your college · Hive" }] }),
  beforeLoad: async ({ context }) => {
    try {
      const user = await context.queryClient.ensureQueryData(meQueryOptions);

      if (user.role !== "campus_admin" || isOnboarded(user)) {
        throw redirect({ to: "/dashboard" });
      }

      return { user };
    } catch (error) {
      if (isApiError(error) && error.status === 401) {
        throw redirect({ to: "/login" });
      }
      throw error;
    }
  },
  component: OnboardingPage,
});

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function domainOf(email: string): string {
  return email.slice(email.lastIndexOf("@") + 1).toLowerCase();
}

function OnboardingPage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [name, setName] = useState("");

  const domain = domainOf(user.email);

  const form = useForm<OnboardingValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: { name: "", slug: "", description: "" },
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

  const submit = useMutation({
    mutationFn: (values: OnboardingValues) =>
      onboardCollege({
        name: values.name,
        slug: values.slug,
        domain,
        ...(values.description ? { description: values.description } : {}),
        ...(uploadId ? { logoUploadId: uploadId } : {}),
      }),
    onSuccess: async () => {
      queryClient.removeQueries({ queryKey: meQueryKey });
      toast.add({ title: "College created", type: "success" });
      await navigate({ to: "/dashboard", replace: true });
    },
    onError: (error) => {
      if (applyFieldErrors(error, form.setError)) return;
      toast.add({
        title: isApiError(error) ? error.message : "Could not create college",
        type: "error",
      });
    },
  });

  const errors = form.formState.errors;

  return (
    <div className="relative isolate flex min-h-svh items-center justify-center overflow-hidden bg-muted/40 p-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <div className="absolute -top-32 left-1/4 size-96 rounded-full bg-[oklch(0.90_0.10_78)] opacity-45 blur-3xl dark:bg-[oklch(0.52_0.1_78)] dark:opacity-25" />
        <div className="absolute -bottom-40 right-1/4 size-96 rounded-full bg-[oklch(0.90_0.06_212)] opacity-40 blur-3xl dark:bg-[oklch(0.44_0.08_218)] dark:opacity-22" />
      </div>

      <div className="w-full max-w-lg">
        <Card>
          <CardHeader>
            <HiveMark className="mb-2" />
            <CardTitle className="font-heading text-section">
              Set up your college
            </CardTitle>
            <CardDescription>
              One college per campus admin. Students with a matching email
              domain join it automatically when they sign up.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form
              onSubmit={form.handleSubmit((values) => submit.mutate(values))}
              noValidate
            >
              <FieldGroup>
                <Field>
                  <FieldLabel>Logo</FieldLabel>
                  <div className="flex items-center gap-4">
                    <Avatar className="size-14 rounded-lg">
                      {preview ? (
                        <AvatarImage src={preview} alt="" />
                      ) : null}
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
                  <FieldLabel htmlFor="name">College name</FieldLabel>
                  <IconInput
                    id="name"
                    icon={BuildingIcon}
                    placeholder="Indian Institute of Technology Madras"
                    {...form.register("name", {
                      onChange: (input: React.ChangeEvent<HTMLInputElement>) => {
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
                    Lowercase letters, numbers and hyphens. Generated from the
                    name until you edit it.
                  </FieldDescription>
                  {errors.slug ? (
                    <FieldError>{errors.slug.message}</FieldError>
                  ) : null}
                </Field>

                <Field data-invalid={!!errors.root}>
                  <FieldLabel htmlFor="domain">Email domain</FieldLabel>
                  <IconInput id="domain" icon={AtSignIcon} value={domain} readOnly disabled />
                  <FieldDescription>
                    Taken from your own address, {user.email}. It has to match,
                    so it is not editable.
                  </FieldDescription>
                </Field>

                <Field data-invalid={!!errors.description}>
                  <FieldLabel htmlFor="description">
                    Description (optional)
                  </FieldLabel>
                  <Textarea
                    id="description"
                    rows={3}
                    {...form.register("description")}
                  />
                  {errors.description ? (
                    <FieldError>{errors.description.message}</FieldError>
                  ) : null}
                </Field>

                <Field>
                  <Button type="submit" disabled={submit.isPending} loading={submit.isPending}>
                    {submit.isPending ? "Creating" : "Create college"}
                  </Button>
                </Field>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
