import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ArrowLeftIcon,
  CalendarDaysIcon,
  CheckIcon,
  ChevronRightIcon,
  CrownIcon,
  HourglassIcon,
  MegaphoneIcon,
  PencilIcon,
  PlusIcon,
  ShieldCheckIcon,
  UserMinusIcon,
  UsersIcon,
  XIcon,
  type LucideIcon,
} from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PageShell, SectionCard, StatusBadge } from "@/components/dashboard-kit";
import {
  AccentBand,
  HexCrest,
  IconChip,
  MetaChip,
} from "@/components/entity-kit";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { CLUB_CATEGORY_META } from "@/lib/category";
import { isApiError } from "@/lib/errors";
import { optimisticJoin, restore } from "@/lib/optimistic";
import { labelOf } from "@/lib/labels";
import {
  canDecideClub,
  canEditClub,
  canJoinClub,
  canLeaveClub,
  canSeeMembers,
  isApprovedMember,
  isClubLeader,
} from "@/lib/permissions";
import {
  clubKeys,
  clubQueryOptions,
  decideClub,
  joinClub,
  leaveClub,
} from "@/lib/queries/clubs";
import { useMe } from "@/lib/queries/me";
import { backLinkClass, initials } from "@/lib/utils";

export const Route = createFileRoute("/_auth/clubs/$slug/")({
  head: ({ params }) => ({ meta: [{ title: `${params.slug} · Hive` }] }),
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(clubQueryOptions(params.slug)),
  component: ClubDetailPage,
});

function QuickLink({
  icon: Icon,
  label,
  hint,
  children,
}: {
  icon: LucideIcon;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-muted/60">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{label}</span>
        {hint ? (
          <span className="block text-xs text-muted-foreground">{hint}</span>
        ) : null}
      </span>
      <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
      {children}
    </div>
  );
}

function ClubDetailPage() {
  const { slug } = Route.useParams();
  const user = useMe();
  const queryClient = useQueryClient();
  const { data, isPending } = useQuery(clubQueryOptions(slug));

  const invalidate = () =>
    void queryClient.invalidateQueries({ queryKey: clubKeys.all });

  const onError = (error: unknown) => {
    toast.add({
      title: isApiError(error) ? error.message : "Something went wrong",
      type: "error",
    });
  };

  const join = useMutation({
    mutationFn: () => joinClub(slug),
    onMutate: () => optimisticJoin(queryClient, slug),
    onSuccess: () => {
      toast.add({ title: "Request sent", type: "success" });
    },
    onError: (error, _input, snapshot) => {
      restore(queryClient, snapshot);
      onError(error);
    },
    onSettled: invalidate,
  });

  const leave = useMutation({
    mutationFn: () => leaveClub(slug, user.id),
    onSuccess: () => {
      invalidate();
      toast.add({ title: `You left ${data?.club.name ?? "the club"}`, type: "success" });
    },
    onError,
  });

  const decide = useMutation({
    mutationFn: (status: "approved" | "rejected") => decideClub(slug, status),
    onSuccess: (_result, status) => {
      invalidate();
      toast.add({ title: `Club ${status}`, type: "success" });
    },
    onError,
  });

  if (isPending || !data) {
    return (
      <PageShell>
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-52 w-full rounded-2xl" />
      </PageShell>
    );
  }

  const club = data.club;
  const meta = CLUB_CATEGORY_META[club.category];
  const leads = isClubLeader(club);
  const member = isApprovedMember(club);
  const waiting = club.viewer?.status === "pending";

  return (
    <PageShell>
      <Link to="/clubs" className={backLinkClass}>
        <ArrowLeftIcon className="size-4" />
        Back to clubs
      </Link>

      <Card className="gap-0 py-0">
        <AccentBand accent={meta.accent} className="h-28">
          <div className="absolute inset-x-5 top-4 flex items-start justify-between gap-2">
            <IconChip icon={meta.icon} className="size-9" />
            <div className="flex flex-wrap items-center gap-2">
              {club.type === "official" ? (
                <Badge className="bg-background/85 text-foreground shadow-sm ring-1 ring-foreground/10 backdrop-blur-sm">
                  <ShieldCheckIcon />
                  Official
                </Badge>
              ) : (
                <Badge className="bg-background/85 text-muted-foreground shadow-sm ring-1 ring-foreground/10 backdrop-blur-sm">
                  Unofficial
                </Badge>
              )}
              {club.status === "approved" ? null : (
                <StatusBadge value={club.status} className="shadow-sm" />
              )}
            </div>
          </div>
        </AccentBand>

        <div className="flex flex-wrap items-end justify-between gap-4 px-5 pb-5">
          <div className="min-w-0">
            <HexCrest
              src={club.logoUrl}
              name={club.name}
              className="-mt-10 size-20"
            />
            <h1 className="mt-3 font-heading text-title">
              {club.name}
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
              <MetaChip icon={meta.icon}>{labelOf(club.category)}</MetaChip>
              <MetaChip icon={UsersIcon}>
                {club.memberCount}{" "}
                {club.memberCount === 1 ? "member" : "members"}
              </MetaChip>
              {club.leader ? (
                <MetaChip icon={CrownIcon}>
                  Led by {club.leader.fullName}
                </MetaChip>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {canEditClub(user, club) ? (
              <Button
                variant="outline"
                render={<Link to="/clubs/$slug/edit" params={{ slug }} />}
              >
                <PencilIcon />
                Edit
              </Button>
            ) : null}
            {leads ? (
              <Button
                variant="outline"
                render={<Link to="/events/new" search={{ club: club.slug }} />}
              >
                <PlusIcon />
                New event
              </Button>
            ) : null}
            {canDecideClub(user, club) ? (
              <>
                <ConfirmDialog
                  trigger={<Button />}
                  triggerLabel={
                    <>
                      <CheckIcon />
                      Approve
                    </>
                  }
                  title={`Approve ${club.name}?`}
                  description="It can run events and issue certificates from then on. This cannot be undone."
                  confirmLabel="Approve club"
                  pending={decide.isPending}
                  onConfirm={() => decide.mutate("approved")}
                />
                <ConfirmDialog
                  trigger={<Button variant="outline" />}
                  triggerLabel={
                    <>
                      <XIcon />
                      Reject
                    </>
                  }
                  title={`Reject ${club.name}?`}
                  description="The leader keeps the club but it stays unofficial and cannot issue certificates."
                  confirmLabel="Reject club"
                  destructive
                  pending={decide.isPending}
                  onConfirm={() => decide.mutate("rejected")}
                />
              </>
            ) : null}
            {waiting ? (
              <Badge
                variant="outline"
                className="h-9 px-3 text-muted-foreground"
              >
                <HourglassIcon />
                Request pending
              </Badge>
            ) : canJoinClub(user, club) ? (
              <Button disabled={join.isPending} loading={join.isPending} onClick={() => join.mutate()}>
                {join.isPending ? "Sending" : "Ask to join"}
              </Button>
            ) : null}
            {canLeaveClub(user, club) ? (
              <ConfirmDialog
                trigger={<Button variant="outline" />}
                triggerLabel={
                  <>
                    <UserMinusIcon />
                    Leave
                  </>
                }
                title={`Leave ${club.name}?`}
                description="You lose access to its announcements and member list. You can ask to join again later."
                confirmLabel="Leave club"
                destructive
                pending={leave.isPending}
                onConfirm={() => leave.mutate()}
              />
            ) : null}
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SectionCard title="About">
            <p className="px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap">
              {club.description ??
                "This club has not written a description yet."}
            </p>
          </SectionCard>
        </div>

        <div className="flex flex-col gap-6">
          <SectionCard title="Leader">
            {club.leader ? (
              <div className="relative flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-muted/60">
                <Avatar className="size-10">
                  {club.leader.avatarUrl ? (
                    <AvatarImage src={club.leader.avatarUrl} alt="" />
                  ) : null}
                  <AvatarFallback>
                    {initials(club.leader.fullName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <Link
                    to="/users/$id"
                    params={{ id: club.leader.userId }}
                    className="text-sm font-medium hover:underline"
                  >
                    {club.leader.fullName}
                  </Link>
                  <p className="text-xs text-muted-foreground">Club leader</p>
                </div>
                <CrownIcon className="size-4 shrink-0 text-muted-foreground" />
              </div>
            ) : (
              <p className="px-3 py-2 text-sm text-muted-foreground">
                No leader assigned yet.
              </p>
            )}
          </SectionCard>

          <SectionCard title="Quick links">
            <div className="flex flex-col gap-0.5">
              <QuickLink
                icon={CalendarDaysIcon}
                label="Events"
              >
                <Link
                  to="/events"
                  search={{ club: club.slug, sort: "soonest", page: 1 }}
                  className="absolute inset-0 rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <span className="sr-only">Events by {club.name}</span>
                </Link>
              </QuickLink>

              {canSeeMembers(user, club) ? (
                <QuickLink
                  icon={UsersIcon}
                  label="Members"
                  hint={`${club.memberCount} on the roster`}
                >
                  <Link
                    to="/clubs/$slug/members"
                    params={{ slug }}
                    className="absolute inset-0 rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <span className="sr-only">Members of {club.name}</span>
                  </Link>
                </QuickLink>
              ) : null}

              {member ? (
                <QuickLink
                  icon={MegaphoneIcon}
                  label="Club wall"
                >
                  <Link
                    to="/announcements"
                    search={{ club: club.slug, page: 1 }}
                    className="absolute inset-0 rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <span className="sr-only">Wall of {club.name}</span>
                  </Link>
                </QuickLink>
              ) : null}
            </div>
          </SectionCard>
        </div>
      </div>
    </PageShell>
  );
}
