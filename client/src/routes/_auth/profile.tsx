import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  HashIcon,
  LogOutIcon,
  UploadIcon,
  UserIcon,
} from "lucide-react";
import { IconInput } from "@/components/icon-input";
import { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PageHeader, PageShell, SectionCard } from "@/components/dashboard-kit";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { STUDENT_BRANCHES } from "@/lib/constants";
import { isApiError } from "@/lib/errors";
import { labelOf } from "@/lib/labels";
import { applyFieldErrors } from "@/lib/form";
import { logout } from "@/lib/queries/auth";
import { meQueryKey, useMe } from "@/lib/queries/me";
import { uploadFile } from "@/lib/queries/uploads";
import { updateProfile, type UpdateProfileInput } from "@/lib/queries/users";

export const Route = createFileRoute("/_auth/profile")({
  head: () => ({ meta: [{ title: "Your profile · Hive" }] }),
  component: ProfilePage,
});

const NONE = "none";

const BRANCH_ITEMS = [
  { value: NONE, label: "Not set" },
  ...STUDENT_BRANCHES.map((value) => ({ value, label: labelOf(value) })),
];

const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(120),
  rollNo: z.string().trim().max(40),
  branch: z.union([z.enum(STUDENT_BRANCHES), z.literal("")]),
  bio: z.string().trim().max(1000),
});

type ProfileValues = z.infer<typeof profileSchema>;

function initials(name?: string): string {
  if (!name) return "";
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}

function blank(value: string): string | null {
  return value === "" ? null : value;
}

function ProfilePage() {
  const user = useMe();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const fileInput = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploadId, setUploadId] = useState<string | null>(null);

  const isStudent = user.role === "student";

  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: user.fullName,
      rollNo: user.student?.rollNo ?? "",
      branch: user.student?.branch ?? "",
      bio: user.student?.bio ?? "",
    },
  });

  const upload = useMutation({
    mutationFn: (file: File) => uploadFile(file, "avatar"),
    onSuccess: (result, file) => {
      setUploadId(result.uploadId);
      setPreview(URL.createObjectURL(file));
      toast.add({ title: "Photo ready, save to apply", type: "success" });
    },
    onError: (error) => {
      toast.add({
        title: isApiError(error) ? error.message : "Could not upload the photo",
        type: "error",
      });
    },
  });

  const save = useMutation({
    mutationFn: (values: ProfileValues) => {
      const input: UpdateProfileInput = { fullName: values.fullName };

      if (uploadId) {
        input.avatarUploadId = uploadId;
      }

      if (isStudent) {
        input.rollNo = blank(values.rollNo);
        input.branch = values.branch === "" ? null : values.branch;
        input.bio = blank(values.bio);
      }

      return updateProfile(input);
    },
    onSuccess: ({ user: updated }) => {
      queryClient.setQueryData(meQueryKey, updated);
      setUploadId(null);
      setPreview(null);
      form.reset({
        fullName: updated.fullName,
        rollNo: updated.student?.rollNo ?? "",
        branch: updated.student?.branch ?? "",
        bio: updated.student?.bio ?? "",
      });
      toast.add({ title: "Profile saved", type: "success" });
    },
    onError: (error) => {
      if (applyFieldErrors(error, form.setError)) return;
      toast.add({
        title: isApiError(error) ? error.message : "Could not save",
        type: "error",
      });
    },
  });

  const signOut = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.clear();
      void navigate({ to: "/login", replace: true });
    },
    onError: () => {
      toast.add({ title: "Could not sign you out", type: "error" });
    },
  });

  const errors = form.formState.errors;

  const touched = form.formState.isDirty || uploadId !== null;

  useUnsavedGuard(touched && !save.isPending);
  const avatarUrl = preview ?? user.avatarUrl;

  return (
    <PageShell size="narrow">
      <PageHeader title="Your profile">
        <ConfirmDialog
          trigger={<Button variant="outline" disabled={signOut.isPending} loading={signOut.isPending} />}
          triggerLabel={
            <>
              <LogOutIcon />
              Log out
            </>
          }
          title="Log out of Hive?"
          description="You will need your email and password to get back in."
          confirmLabel="Log out"
          destructive
          pending={signOut.isPending}
          onConfirm={() => signOut.mutate()}
        />
      </PageHeader>

      <SectionCard
        title="Photo"
        description="Square images work best. Up to 5MB, converted to WebP."
      >
        <div className="flex items-center gap-4 px-3 py-2">
          <Avatar className="size-16">
            {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
            <AvatarFallback className="text-lg">
              {initials(user.fullName)}
            </AvatarFallback>
          </Avatar>

          <div className="flex flex-col gap-2">
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
              variant="outline"
              size="sm"
              disabled={upload.isPending} loading={upload.isPending}
              onClick={() => fileInput.current?.click()}
            >
              <UploadIcon />
              {upload.isPending ? "Uploading" : "Choose photo"}
            </Button>
            {uploadId ? (
              <Badge variant="outline">Ready, save to apply</Badge>
            ) : null}
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Details">
        <div className="px-3 py-2">
          <form
            onSubmit={form.handleSubmit((values) => save.mutate(values))}
            noValidate
          >
            <FieldGroup>
              <Field data-invalid={!!errors.fullName}>
                <FieldLabel htmlFor="fullName">Full name</FieldLabel>
                <IconInput id="fullName" icon={UserIcon} {...form.register("fullName")} />
                {errors.fullName ? (
                  <FieldError>{errors.fullName.message}</FieldError>
                ) : null}
              </Field>

              {isStudent ? (
                <>
                  <Field data-invalid={!!errors.rollNo}>
                    <FieldLabel htmlFor="rollNo">Roll number</FieldLabel>
                    <IconInput id="rollNo" icon={HashIcon} {...form.register("rollNo")} />
                    <FieldDescription>
                      Unique within your college. Leave empty to clear.
                    </FieldDescription>
                    {errors.rollNo ? (
                      <FieldError>{errors.rollNo.message}</FieldError>
                    ) : null}
                  </Field>

                  <Field data-invalid={!!errors.branch}>
                    <FieldLabel htmlFor="branch">Branch</FieldLabel>
                    <Controller
                      control={form.control}
                      name="branch"
                      render={({ field }) => (
                        <Select
                          items={BRANCH_ITEMS}
                          value={field.value === "" ? NONE : field.value}
                          onValueChange={(value) =>
                            field.onChange(value === NONE ? "" : value)
                          }
                        >
                          <SelectTrigger id="branch">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {BRANCH_ITEMS.map((item) => (
                              <SelectItem key={item.value} value={item.value}>
                                {item.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    <FieldDescription>
                      Pick the closest one, or leave it unset
                    </FieldDescription>
                    {errors.branch ? (
                      <FieldError>{errors.branch.message}</FieldError>
                    ) : null}
                  </Field>

                  <Field data-invalid={!!errors.bio}>
                    <FieldLabel htmlFor="bio">Bio</FieldLabel>
                    <Textarea id="bio" rows={4} {...form.register("bio")} />
                    <FieldDescription>
                      Shown on your public profile
                    </FieldDescription>
                    {errors.bio ? (
                      <FieldError>{errors.bio.message}</FieldError>
                    ) : null}
                  </Field>
                </>
              ) : null}

              <Field>
                <Button type="submit" disabled={save.isPending || !touched} loading={save.isPending}>
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
