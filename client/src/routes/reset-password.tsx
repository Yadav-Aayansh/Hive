import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeftIcon, LinkIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AuthShell } from "@/components/auth-shell";
import { PasswordInput } from "@/components/password-input";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { toast } from "@/components/ui/toast";
import { fieldErrorsOf, isApiError } from "@/lib/errors";
import { applyFieldErrors } from "@/lib/form";
import { resetPassword } from "@/lib/queries/auth";

const resetSearchSchema = z.object({
  token: z.string().trim().min(1).max(128).optional(),
});

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Must be at least 8 characters")
      .max(72, "Must be 72 characters or fewer"),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Both passwords must match",
  });

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Choose a new password · Hive" }] }),
  validateSearch: resetSearchSchema,
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { token } = Route.useSearch();
  const navigate = useNavigate();

  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const mutation = useMutation({
    mutationFn: (values: ResetPasswordValues) =>
      resetPassword({ token: token ?? "", password: values.password }),
    onSuccess: async (result) => {
      toast.add({ title: result.message, type: "success" });
      await navigate({ to: "/login", replace: true });
    },
    onError: (error) => {
      const dead = fieldErrorsOf(error).find((detail) => detail.field === "token");

      if (dead) {
        form.setError("root", { type: "server", message: dead.message });
        return;
      }

      if (applyFieldErrors(error, form.setError)) return;

      toast.add({
        title: isApiError(error) ? error.message : "Could not reset your password",
        type: "error",
      });
    },
  });

  const errors = form.formState.errors;

  const footer = (
    <Link
      to="/login"
      className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
    >
      <ArrowLeftIcon className="size-3.5" />
      Back to sign in
    </Link>
  );

  if (!token) {
    return (
      <AuthShell
        title="This link is incomplete"
        description="Open it straight from the email"
        footer={footer}
      >
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed px-5 py-8 text-center">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <LinkIcon className="size-5" />
          </span>
          <Button variant="ghost" size="sm" render={<Link to="/forgot-password" />}>
            Request a new link
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Choose a new password"
      description="You will be signed out everywhere once it changes"
      footer={footer}
    >
      <form
        onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
        noValidate
      >
        <FieldGroup className="gap-5">
          <Field className="gap-2" data-invalid={!!errors.password}>
            <FieldLabel htmlFor="password">New password</FieldLabel>
            <PasswordInput
              id="password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              className="h-11"
              {...form.register("password")}
            />
            {errors.password ? (
              <FieldError>{errors.password.message}</FieldError>
            ) : null}
          </Field>

          <Field className="gap-2" data-invalid={!!errors.confirmPassword}>
            <FieldLabel htmlFor="confirmPassword">Confirm password</FieldLabel>
            <PasswordInput
              id="confirmPassword"
              autoComplete="new-password"
              placeholder="Type it again"
              className="h-11"
              {...form.register("confirmPassword")}
            />
            {errors.confirmPassword ? (
              <FieldError>{errors.confirmPassword.message}</FieldError>
            ) : null}
          </Field>

          {errors.root ? <FieldError>{errors.root.message}</FieldError> : null}

          <Button
            type="submit"
            size="lg"
            className="h-11 w-full"
            disabled={mutation.isPending}
            loading={mutation.isPending}
          >
            {mutation.isPending ? "Saving" : "Change password"}
          </Button>
        </FieldGroup>
      </form>
    </AuthShell>
  );
}
