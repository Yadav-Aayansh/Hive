import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, notFound } from "@tanstack/react-router";
import {
  BuildingIcon,
  CalendarDaysIcon,
  SparklesIcon,
  UploadIcon,
  type LucideIcon,
} from "lucide-react";
import { IconInput } from "@/components/icon-input";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { PageHeader, PageShell, SectionCard } from "@/components/dashboard-kit";
import { AccentBand, IconChip, MetaChip } from "@/components/entity-kit";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
  collegeStatsQueryOptions,
  confirmCheckout,
  startCheckout,
  updateCollege,
  type UpdateCollegeInput,
} from "@/lib/queries/colleges";
import { uploadFile } from "@/lib/queries/uploads";
import { cn } from "@/lib/utils";

const collegeSchema = z.object({
  name: z.string().trim().max(160),
  description: z.string().trim().max(2000),
});

const CHECKOUT_SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";

interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description: string;
  handler: (response: RazorpayResponse) => void;
  modal?: { ondismiss?: () => void };
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => { open: () => void };
  }
}

function loadCheckout(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = CHECKOUT_SCRIPT;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("Could not reach the payment gateway"));
    document.body.appendChild(script);
  });
}

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

      <PlanCard />

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

function UsageRow({
  icon,
  label,
  used,
  limit,
}: {
  icon: LucideIcon;
  label: string;
  used: number;
  limit: number;
}) {
  const percent = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  const full = used >= limit;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <MetaChip icon={icon}>{label}</MetaChip>
        <span
          className={cn(
            "text-xs tabular-nums",
            full ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {used} of {limit}
        </span>
      </div>
      <span className="block h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <span
          className={cn(
            "block h-full rounded-full transition-[width] duration-500",
            full ? "bg-destructive/70" : "bg-primary",
          )}
          style={{ width: `${percent}%` }}
        />
      </span>
    </div>
  );
}

function PlanCard() {
  const queryClient = useQueryClient();
  const stats = useQuery(collegeStatsQueryOptions);

  const upgrade = useMutation({
    mutationFn: async () => {
      const { checkout } = await startCheckout();
      await loadCheckout();

      return new Promise<boolean>((resolve, reject) => {
        const Checkout = window.Razorpay;

        if (!Checkout) {
          reject(new Error("Could not reach the payment gateway"));
          return;
        }

        new Checkout({
          key: checkout.keyId,
          amount: checkout.amount,
          currency: checkout.currency,
          order_id: checkout.orderId,
          name: "Hive",
          description: "Pro plan",
          handler: (response) => {
            confirmCheckout({
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            })
              .then(() => resolve(true))
              .catch(reject);
          },
          modal: { ondismiss: () => resolve(false) },
        }).open();
      });
    },
    onSuccess: (paid) => {
      if (!paid) return;

      void queryClient.invalidateQueries({ queryKey: ["colleges"] });
      toast.add({ title: "Your college is on the Pro plan", type: "success" });
    },
    onError: (error) => {
      toast.add({
        title: isApiError(error)
          ? error.message
          : "Could not complete the payment",
        type: "error",
      });
    },
  });

  if (stats.isPending) {
    return <Skeleton className="h-52 w-full rounded-2xl" />;
  }

  if (!stats.data) {
    return null;
  }

  const { plan, clubs, events } = stats.data.stats;
  const pro = plan.name === "pro";

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <AccentBand accent={pro ? "a1" : "a4"} className="h-20">
        <div className="absolute inset-x-5 top-4 flex items-start justify-between gap-2">
          <IconChip icon={pro ? SparklesIcon : BuildingIcon} className="size-9" />
          <Badge className="bg-background/85 text-foreground shadow-sm ring-1 ring-foreground/10 backdrop-blur-sm">
            {pro ? "Pro" : "Free"}
          </Badge>
        </div>
      </AccentBand>

      <div className="flex flex-col gap-4 px-5 pt-4 pb-5">
        <div>
          <h2 className="font-heading text-section">
            {pro ? "Pro plan" : "Free plan"}
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {pro
              ? "No limit on the clubs and events your college can run"
              : "Students cannot create more once a limit is reached"}
          </p>
        </div>

        {pro ? (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t pt-4">
            <MetaChip icon={BuildingIcon}>
              {clubs.total} {clubs.total === 1 ? "club" : "clubs"}
            </MetaChip>
            <MetaChip icon={CalendarDaysIcon}>
              {events.total} {events.total === 1 ? "event" : "events"}
            </MetaChip>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-3.5">
              {plan.clubLimit === null ? null : (
                <UsageRow
                  icon={BuildingIcon}
                  label="Clubs"
                  used={clubs.total}
                  limit={plan.clubLimit}
                />
              )}
              {plan.eventLimit === null ? null : (
                <UsageRow
                  icon={CalendarDaysIcon}
                  label="Events"
                  used={events.total}
                  limit={plan.eventLimit}
                />
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
              <p className="text-xs text-muted-foreground">
                One payment, no limits after that
              </p>
              <Button
                disabled={upgrade.isPending}
                loading={upgrade.isPending}
                onClick={() => upgrade.mutate()}
              >
                <SparklesIcon />
                {upgrade.isPending ? "Opening checkout" : "Upgrade to Pro"}
              </Button>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
