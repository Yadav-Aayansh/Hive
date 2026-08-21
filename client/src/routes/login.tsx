import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { MailIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AuthShell } from "@/components/auth-shell";
import { IconInput } from "@/components/icon-input";
import { PasswordInput } from "@/components/password-input";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { toast } from "@/components/ui/toast";
import { isApiError } from "@/lib/errors";
import { applyFieldErrors } from "@/lib/form";
import { login } from "@/lib/queries/auth";
import {
  isOnboarded,
  meQueryKey,
  meQueryOptions,
  type UserDto,
} from "@/lib/queries/me";

const loginSchema = z.object({
  email: z.email("Enter a valid email"),
  password: z.string().min(1, "Required"),
});

type LoginValues = z.infer<typeof loginSchema>;

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in · Hive" }] }),
  beforeLoad: async ({ context }) => {
    let user: UserDto;

    try {
      user = await context.queryClient.ensureQueryData(meQueryOptions);
    } catch (error) {
      if (isApiError(error) && error.status === 401) return;
      throw error;
    }

    throw redirect({ to: isOnboarded(user) ? "/dashboard" : "/onboarding" });
  },
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: ({ user }) => {
      queryClient.setQueryData(meQueryKey, user);
      void navigate({
        to: isOnboarded(user) ? "/dashboard" : "/onboarding",
        replace: true,
      });
    },
    onError: (error) => {
      if (applyFieldErrors(error, form.setError)) return;

      toast.add({
        title: isApiError(error) ? error.message : "Could not sign you in",
        type: "error",
      });
    },
  });

  const errors = form.formState.errors;

  return (
    <AuthShell
      title="Welcome back"
      description="Sign in with the email your college gave you"
      footer={
        <>
          New to Hive?{" "}
          <Link to="/signup" className="font-medium text-primary hover:underline">
            Create an account
          </Link>
        </>
      }
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

          <Field className="gap-2" data-invalid={!!errors.password}>
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <PasswordInput
              id="password"
              autoComplete="current-password"
              placeholder="Your password"
              className="h-11"
              {...form.register("password")}
            />
            {errors.password ? (
              <FieldError>{errors.password.message}</FieldError>
            ) : null}
          </Field>

          <Button
            type="submit"
            size="lg"
            className="h-11 w-full"
            disabled={mutation.isPending} loading={mutation.isPending}
          >
            {mutation.isPending ? "Signing in" : "Sign in"}
          </Button>
        </FieldGroup>
      </form>
    </AuthShell>
  );
}
