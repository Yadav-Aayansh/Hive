import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import {
  AwardIcon,
  CopyIcon,
  ExternalLinkIcon,
  MedalIcon,
  TrophyIcon,
} from "lucide-react";
import { z } from "zod";
import {
  DataRow,
  EmptyState,
  ErrorState,
  PageHeader,
  PageShell,
  Pagination,
  RowGroup,
  SectionCard,
} from "@/components/dashboard-kit";
import { toast } from "@/components/ui/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { ResultType } from "@/lib/constants";
import { labelOf } from "@/lib/labels";
import { certificatesQueryOptions } from "@/lib/queries/certificates";

const certificateSearchSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
});

export const RESULT_ICONS: Record<ResultType, typeof TrophyIcon> = {
  winner: TrophyIcon,
  runner_up: MedalIcon,
  participant: AwardIcon,
};

export const Route = createFileRoute("/_auth/certificates")({
  head: () => ({ meta: [{ title: "Certificates · Hive" }] }),
  validateSearch: certificateSearchSchema,
  component: CertificatesPage,
});

function CertificatesPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data, isPending, isError, error, refetch } = useQuery(
    certificatesQueryOptions(search.page),
  );

  const rows = data?.certificates ?? [];
  const lastPage = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <PageShell size="narrow">
      <PageHeader title="Certificates" />

      <SectionCard
        title="Your wallet"
        bare={rows.length > 0}
      >
        {isError ? (
          <ErrorState error={error} onRetry={() => void refetch()} />
        ) : isPending ? (
          <div className="flex flex-col gap-3 p-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-16 w-full" />
            ))}
          </div>
        ) : rows.length > 0 ? (
          <>
            <div className="p-2">
              <RowGroup>
                {rows.map((certificate) => {
                  const Icon = RESULT_ICONS[certificate.result];

                  return (
                    <DataRow key={certificate.serial}>
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Icon className="size-5" />
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{certificate.event.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {certificate.club.name} · issued{" "}
                          {format(new Date(certificate.issuedAt), "d MMM yyyy")}
                        </p>
                        <button
                          type="button"
                          className="mt-1 inline-flex items-center gap-1.5 rounded-md font-mono text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                          aria-label={`Copy serial ${certificate.serial}`}
                          onClick={() => {
                            void navigator.clipboard
                              .writeText(certificate.serial)
                              .then(() =>
                                toast.add({
                                  title: "Serial copied",
                                  type: "success",
                                }),
                              )
                              .catch(() =>
                                toast.add({
                                  title: "Could not copy the serial",
                                  type: "error",
                                }),
                              );
                          }}
                        >
                          {certificate.serial}
                          <CopyIcon className="size-3" />
                        </button>
                      </div>

                      <Badge variant="outline">
                        {labelOf(certificate.result)}
                      </Badge>

                      <Button
                        variant="outline"
                        size="sm"
                        render={
                          <Link
                            to="/verify/$serial"
                            params={{ serial: certificate.serial }}
                          />
                        }
                      >
                        <ExternalLinkIcon />
                        Open
                      </Button>
                    </DataRow>
                  );
                })}
              </RowGroup>
            </div>

            <Pagination
              page={search.page}
              lastPage={lastPage}
              onChange={(next) => void navigate({ search: { page: next } })}
            />
          </>
        ) : (
          <EmptyState
            icon={AwardIcon}
            title="No certificates yet"
            description="Attend an event run by an official club and your certificate lands here automatically"
          >
            <Button variant="outline" render={<Link to="/events" />}>
              Browse events
            </Button>
          </EmptyState>
        )}
      </SectionCard>
    </PageShell>
  );
}
