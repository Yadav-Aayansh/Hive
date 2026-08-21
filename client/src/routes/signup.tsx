import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  GraduationCapIcon,
  MailIcon,
  ShieldCheckIcon,
  UserIcon,
  UsersIcon,
} from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AuthShell } from "@/components/auth-shell";
import { IconInput } from "@/components/icon-input";
import { PasswordInput } from "@/components/password-input";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { toast } from "@/components/ui/toast";
import type { UserRole } from "@/lib/constants";
import { isApiError } from "@/lib/errors";
import { applyFieldErrors } from "@/lib/form";
import { signup } from "@/lib/queries/auth";
import {
  isOnboarded,
  meQueryKey,
  meQueryOptions,
  type UserDto,
} from "@/lib/queries/me";
import { cn } from "@/lib/utils";

const ROLE_OPTIONS: {
  value: UserRole;
  icon: typeof UsersIcon;
  title: string;
  tagline: string;
}[] = [
  {
    value: "student",
    icon: GraduationCapIcon,
    title: "Student",
    tagline: "Join clubs and earn certificates",
  },
  {
    value: "campus_admin",
    icon: ShieldCheckIcon,
    title: "Campus admin",
    tagline: "Run the college and approve clubs",
  },
];

const signupSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(120),
  email: z.email("Enter a valid email"),
  password: z
    .string()
    .min(8, "Must be at least 8 characters")
    .max(72, "Must be 72 characters or fewer"),
});

type SignupValues = z.infer<typeof signupSchema>;

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Sign up · Hive" }] }),
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
  component: SignupPage,
});

function StepDots({ step }: { step: 1 | 2 }) {
  return (
    <div className="flex items-center gap-1.5">
      {[1, 2].map((value) => (
        <span
          key={value}
          className={cn(
            "h-1 rounded-full transition-all",
            value === step ? "w-5 bg-primary" : "w-2.5 bg-border",
          )}
        />
      ))}
      <span className="ml-1 text-[11px] text-muted-foreground">{step} of 2</span>
    </div>
  );
}

function RoleCard({
  option,
  selected,
  onSelect,
}: {
  option: (typeof ROLE_OPTIONS)[number];
  selected: boolean;
  onSelect: () => void;
}) {
  const Icon = option.icon;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl border bg-background/60 p-3.5 text-left transition-all focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
        selected
          ? "border-primary/60 bg-primary/10"
          : "hover:border-primary/30 hover:bg-muted/50",
      )}
    >
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-xl transition-colors",
          selected
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground",
        )}
      >
        <Icon className="size-4" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{option.title}</span>
        <span className="block text-xs text-muted-foreground">
          {option.tagline}
        </span>
      </span>

      <span
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors",
          selected
            ? "border-transparent bg-primary text-primary-foreground"
            : "border-border",
        )}
      >
        {selected ? <CheckIcon className="size-3" /> : null}
      </span>
    </button>
  );
}

function SignupPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<1 | 2>(1);
  const [role, setRole] = useState<UserRole>("student");

  const form = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { fullName: "", email: "", password: "" },
  });

  const mutation = useMutation({
    mutationFn: signup,
    onSuccess: ({ user }) => {
      queryClient.setQueryData(meQueryKey, user);
      void navigate({
        to: isOnboarded(user) ? "/dashboard" : "/onboarding",
        replace: true,
      });
    },
    onError: (error) => {
      if (applyFieldErrors(error, form.setError)) {
        if (
          form.formState.errors.fullName ??
          form.formState.errors.email ??
          form.formState.errors.password
        ) {
          setStep(2);
        }
        return;
      }

      toast.add({
        title: isApiError(error) ? error.message : "Could not create account",
        type: "error",
      });
    },
  });

  const errors = form.formState.errors;

  if (step === 1) {
    return (
      <AuthShell
        title="Join Hive"
        description="Pick how you will use Hive"
        footer={
          <>
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-medium text-primary hover:underline"
            >
              Sign in
            </Link>
          </>
        }
      >
        <div className="flex flex-col gap-5">
          <StepDots step={1} />

          <div className="flex flex-col gap-2.5">
            {ROLE_OPTIONS.map((option) => (
              <RoleCard
                key={option.value}
                option={option}
                selected={role === option.value}
                onSelect={() => setRole(option.value)}
              />
            ))}
          </div>

          <Button
            type="button"
            size="lg"
            className="h-11 w-full"
            onClick={() => setStep(2)}
          >
            Continue
            <ArrowRightIcon />
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create your account"
      description="Three details and you are in"
      footer={
        <>
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-medium text-primary hover:underline"
          >
            Sign in
          </Link>
        </>
      }
    >
      <form
        onSubmit={form.handleSubmit((values) => mutation.mutate({ ...values, role }))}
        noValidate
      >
        <FieldGroup className="gap-5">

          <Field className="gap-2" data-invalid={!!errors.fullName}>
            <FieldLabel htmlFor="fullName">Full name</FieldLabel>
            <IconInput
              id="fullName"
              icon={UserIcon}
              autoComplete="name"
              placeholder="Your name"
              className="h-11"
              {...form.register("fullName")}
            />
            {errors.fullName ? (
              <FieldError>{errors.fullName.message}</FieldError>
            ) : null}
          </Field>

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
              autoComplete="new-password"
              placeholder="At least 8 characters"
              className="h-11"
              {...form.register("password")}
            />
            {errors.password ? (
              <FieldError>{errors.password.message}</FieldError>
            ) : null}
          </Field>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="h-11"
              onClick={() => setStep(1)}
            >
              <ArrowLeftIcon />
              Back
            </Button>
            <Button
              type="submit"
              size="lg"
              className="h-11 flex-1"
              disabled={mutation.isPending} loading={mutation.isPending}
            >
              {mutation.isPending ? "Creating account" : "Create account"}
            </Button>
          </div>
        </FieldGroup>
      </form>
    </AuthShell>
  );
}
