import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import {
  AwardIcon,
  DownloadIcon,
  MedalIcon,
  ShieldCheckIcon,
  TrophyIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/dashboard-kit";
import { Skeleton } from "@/components/ui/skeleton";
import type { ResultType } from "@/lib/constants";
import { isApiError } from "@/lib/errors";
import { labelOf } from "@/lib/labels";
import {
  verificationQueryOptions,
  type CertificateVerificationDto,
} from "@/lib/queries/certificates";

const RESULT_ICONS: Record<ResultType, typeof TrophyIcon> = {
  winner: TrophyIcon,
  runner_up: MedalIcon,
  participant: AwardIcon,
};

export const Route = createFileRoute("/verify/$serial")({
  component: VerifyPage,
});

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap justify-between gap-2 border-b py-2.5 last:border-b-0">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

function VerifyPage() {
  const { serial } = Route.useParams();
  const { data, isPending, error } = useQuery(verificationQueryOptions(serial));

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/40 p-6">
      <div className="w-full max-w-lg">
        {isPending ? (
          <Skeleton className="h-96 w-full" />
        ) : error || !data ? (
          <Card>
            <EmptyState
              icon={ShieldCheckIcon}
              title="Certificate not found"
              description={
                isApiError(error) && error.status === 404
                  ? "No certificate matches this serial. Check it against the printed copy."
                  : "We could not verify this certificate right now."
              }
            >
              <p className="font-mono text-xs text-muted-foreground">
                {serial}
              </p>
            </EmptyState>
          </Card>
        ) : (
          <VerifiedCard certificate={data.certificate} />
        )}
      </div>
    </div>
  );
}

function VerifiedCard({
  certificate,
}: {
  certificate: CertificateVerificationDto;
}) {
  const Icon = RESULT_ICONS[certificate.result];

  return (
    <Card>
      <CardHeader className="items-center text-center">
        <div className="bg-primary/10 text-primary mx-auto flex size-12 items-center justify-center rounded-full">
          <ShieldCheckIcon className="size-6" />
        </div>
        <CardTitle className="mt-2">Verified certificate</CardTitle>
        <CardDescription>
          Issued by {certificate.college.name}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-6">
        <div className="text-center">
          <p className="text-muted-foreground text-sm">This certifies that</p>
          <p className="text-xl font-semibold">
            {certificate.recipient.fullName}
          </p>
          <div className="mt-2 flex items-center justify-center gap-2">
            <Badge variant="outline">
              <Icon className="size-3.5" />
              {labelOf(certificate.result)}
            </Badge>
          </div>
        </div>

        <div className="flex flex-col">
          <Row label="Event" value={certificate.event.title} />
          <Row label="Club" value={certificate.club.name} />
          {certificate.event.startsAt ? (
            <Row
              label="Held on"
              value={format(
                new Date(certificate.event.startsAt),
                "d MMM yyyy",
              )}
            />
          ) : null}
          {certificate.event.venue ? (
            <Row label="Venue" value={certificate.event.venue} />
          ) : null}
          <Row
            label="Issued"
            value={format(new Date(certificate.issuedAt), "d MMM yyyy")}
          />
          <Row label="Serial" value={certificate.serial} />
        </div>

        {certificate.fileUrl ? (
          <Button
            render={
              <a
                href={certificate.fileUrl}
                target="_blank"
                rel="noreferrer noopener"
              />
            }
          >
            <DownloadIcon />
            Download PDF
          </Button>
        ) : (
          <p className="text-muted-foreground text-center text-xs">
            The PDF could not be prepared right now, but this record is valid.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
