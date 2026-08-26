import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { ArrowLeftIcon, GraduationCapIcon, UserIcon } from "lucide-react";
import { PageShell, SectionCard } from "@/components/dashboard-kit";
import { AccentBand, IconChip, MetaChip } from "@/components/entity-kit";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { accentOf } from "@/lib/category";
import { labelOf } from "@/lib/labels";
import { publicProfileQueryOptions } from "@/lib/queries/users";
import { backLinkClass, initials } from "@/lib/utils";

export const Route = createFileRoute("/_auth/users/$id")({
  head: () => ({ meta: [{ title: "Profile · Hive" }] }),
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(publicProfileQueryOptions(params.id)),
  component: PublicProfilePage,
});

function PublicProfilePage() {
  const { id } = Route.useParams();
  const router = useRouter();
  const { data } = useQuery(publicProfileQueryOptions(id));

  if (!data) {
    return (
      <PageShell size="narrow">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-56 w-full rounded-2xl" />
      </PageShell>
    );
  }

  const user = data.user;

  return (
    <PageShell size="narrow">
      <button
        type="button"
        className={backLinkClass}
        onClick={() => router.history.back()}
      >
        <ArrowLeftIcon className="size-4" />
        Back
      </button>

      <Card className="gap-0 overflow-hidden py-0">
        <AccentBand accent={accentOf(user.id)} className="h-28">
          <div className="absolute inset-x-5 top-4">
            <IconChip icon={UserIcon} className="size-9" />
          </div>
        </AccentBand>

        <div className="flex flex-wrap items-end gap-4 px-5 pb-5">
          <div className="min-w-0 flex-1">
            <Avatar className="-mt-12 size-24 ring-4 ring-card">
              {user.avatarUrl ? (
                <AvatarImage src={user.avatarUrl} alt="" />
              ) : null}
              <AvatarFallback className="text-title">
                {initials(user.fullName)}
              </AvatarFallback>
            </Avatar>

            <h1 className="mt-3 font-heading text-title">{user.fullName}</h1>

            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
              <MetaChip icon={GraduationCapIcon}>
                {user.branch ? labelOf(user.branch) : "Branch not set"}
              </MetaChip>
            </div>
          </div>
        </div>
      </Card>

      <SectionCard title="About">
        <p className="px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap">
          {user.bio ?? "This student has not written a bio yet."}
        </p>
      </SectionCard>
    </PageShell>
  );
}
