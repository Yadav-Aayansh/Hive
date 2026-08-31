import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeftIcon, MailCheckIcon, MailIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AuthShell } from "@/components/auth-shell";
import { IconInput } from "@/components/icon-input";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { toast } from "@/components/ui/toast";
import { isApiError } from "@/lib/errors";
import { applyFieldErrors } from "@/lib/form";
import { forgotPassword } from "@/lib/queries/auth";

const forgotPasswordSchema = z.object({
  email: z.email("Enter a valid email"),
});

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Reset your password · Hive" }] }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const mutation = useMutation({
    mutationFn: forgotPassword,
    onError: (error) => {
      if (applyFieldErrors(error, form.setError)) return;

      toast.add({
        title: isApiError(error) ? error.message : "Could not send the email",
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

  if (mutation.isSuccess) {
    return (
      <AuthShell
        title="Check your inbox"
        description="The link works once and expires in 30 minutes"
        footer={footer}
      >
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed px-5 py-8 text-center">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <MailCheckIcon className="size-5" />
          </span>
          <p className="text-sm font-medium">{form.getValues("email")}</p>
          <p className="text-xs text-muted-foreground">
            Check spam if nothing arrives
          </p>
          <Button variant="ghost" size="sm" onClick={() => mutation.reset()}>
            Use a different email
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Forgot your password?"
      description="We will email you a link to choose a new one"
      footer={footer}
    >
      <form
        onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
        noValidate
      >
        <FieldGroup className="gap-5">
          <Field className="gap-2" data-invalid={!!errors.email}>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <IconInput
              id="email"
              icon={MailIcon}
              type="email"
              autoComplete="email"
              placeholder="you@college.edu"
              className="h-11"
              {...form.register("email")}
            />
            {errors.email ? <FieldError>{errors.email.message}</FieldError> : null}
          </Field>

          <Button
            type="submit"
            size="lg"
            className="h-11 w-full"
            disabled={mutation.isPending}
            loading={mutation.isPending}
          >
            {mutation.isPending ? "Sending" : "Send reset link"}
          </Button>
        </FieldGroup>
      </form>
    </AuthShell>
  );
}
