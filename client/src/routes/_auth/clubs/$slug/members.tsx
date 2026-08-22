import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";
import {
  ArrowLeftIcon,
  CheckIcon,
  CrownIcon,
  UserMinusIcon,
  UsersIcon,
  XIcon,
} from "lucide-react";
import { useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  DataRow,
  EmptyState,
  ErrorState,
  PageHeader,
  PageShell,
  RowGroup,
  SectionCard,
} from "@/components/dashboard-kit";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { isApiError } from "@/lib/errors";
import { canManageMembers, canTransferLeader } from "@/lib/permissions";
import {
  clubKeys,
  clubQueryOptions,
  decideMembership,
  membersQueryOptions,
  leaveClub,
  removeMember,
  transferLeader,
  type ClubMemberDto,
} from "@/lib/queries/clubs";
import { useMe } from "@/lib/queries/me";

export const Route = createFileRoute("/_auth/clubs/$slug/members")({
  loader: ({ context, params }) =>
    Promise.all([
      context.queryClient.ensureQueryData(clubQueryOptions(params.slug)),
      context.queryClient.ensureQueryData(membersQueryOptions(params.slug)),
    ]),
  component: MembersPage,
});

function initials(name?: string): string {
  if (!name) return "";
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}

function MembersPage() {
  const { slug } = Route.useParams();
  const user = useMe();
  const queryClient = useQueryClient();

  const club = useQuery(clubQueryOptions(slug));
  const members = useQuery(membersQueryOptions(slug));

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: clubKeys.all });
    void queryClient.invalidateQueries({ queryKey: ["clubs", "members", slug] });
  };

  const onError = (error: unknown) => {
    toast.add({
      title: isApiError(error) ? error.message : "Something went wrong",
      type: "error",
    });
  };

  const decide = useMutation({
    mutationFn: ({
      userId,
      status,
    }: {
      userId: string;
      status: "approved" | "rejected";
    }) => decideMembership(slug, userId, status),
    onSuccess: (_result, variables) => {
      invalidate();
      toast.add({ title: `Request ${variables.status}`, type: "success" });
    },
    onError,
  });

  const kick = useMutation({
    mutationFn: (userId: string) => removeMember(slug, userId),
    onSuccess: () => {
      invalidate();
      toast.add({ title: "Member removed", type: "success" });
    },
    onError,
  });

  if (members.isError) {
    return (
      <PageShell size="narrow">
        <ErrorState
          error={members.error}
          onRetry={() => void members.refetch()}
        />
      </PageShell>
    );
  }

  if (!club.data || members.isPending) {
    return (
      <PageShell>
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </PageShell>
    );
  }

  const detail = club.data.club;
  const rows = members.data?.members ?? [];
  const pending = rows.filter((member) => member.status === "pending");
  const approved = rows.filter((member) => member.status === "approved");
  const manages = canManageMembers(user, detail);
  const transfers = canTransferLeader(user, detail);

  return (
    <PageShell>
      <Link
        to="/clubs/$slug"
        params={{ slug }}
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" />
        Back to {detail.name}
      </Link>

      <PageHeader title="Members" />

      {manages ? (
        <SectionCard
          title="Join requests"
          action={
            pending.length > 0 ? (
              <Badge variant="outline">{pending.length} pending</Badge>
            ) : null
          }
        >
          {pending.length === 0 ? (
            <EmptyState
              icon={UsersIcon}
              title="Nothing pending"
              description="New requests will appear here"
            />
          ) : (
            <RowGroup>
              {pending.map((member) => (
                <DataRow key={member.userId}>
                  <MemberIdentity member={member} />
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(member.requestedAt), "d MMM")}
                  </span>
                  <Button
                    size="sm"
                    disabled={decide.isPending} loading={decide.isPending}
                    onClick={() =>
                      decide.mutate({
                        userId: member.userId,
                        status: "approved",
                      })
                    }
                  >
                    <CheckIcon />
                    Approve
                  </Button>
                  <ConfirmDialog
                    trigger={
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={decide.isPending} loading={decide.isPending}
                      />
                    }
                    triggerLabel={
                      <>
                        <XIcon />
                        Reject
                      </>
                    }
                    title={`Reject ${member.fullName}?`}
                    description="They stay out of the club and will not see its wall. They can ask again later."
                    confirmLabel="Reject request"
                    destructive
                    pending={decide.isPending}
                    onConfirm={() =>
                      decide.mutate({
                        userId: member.userId,
                        status: "rejected",
                      })
                    }
                  />
                </DataRow>
              ))}
            </RowGroup>
          )}
        </SectionCard>
      ) : null}

      <SectionCard
        title="Roster"
        action={<Badge variant="outline">{approved.length}</Badge>}
      >
        {approved.length === 0 ? (
          <EmptyState
            icon={UsersIcon}
            title="No members yet"
            description="Share the club page so people can request to join"
          />
        ) : (
          <RowGroup>
            {approved.map((member) => (
              <DataRow key={member.userId}>
                <MemberIdentity member={member} />

                {member.role === "leader" ? (
                  <Badge className="">
                    <CrownIcon className="size-3.5" />
                    Leader
                  </Badge>
                ) : null}

                {transfers &&
                member.role !== "leader" &&
                member.userId !== user.id ? (
                  <TransferDialog slug={slug} member={member} />
                ) : null}

                {manages && member.userId !== user.id ? (
                  <ConfirmDialog
                    trigger={
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={kick.isPending} loading={kick.isPending}
                      />
                    }
                    triggerLabel={
                      <>
                        <UserMinusIcon />
                        Remove
                      </>
                    }
                    title={`Remove ${member.fullName}?`}
                    description="They lose access to the roster, the wall and this club's events. They can ask to join again."
                    confirmLabel="Remove member"
                    destructive
                    pending={kick.isPending}
                    onConfirm={() => kick.mutate(member.userId)}
                  />
                ) : null}

                {member.userId === user.id && member.role !== "leader" ? (
                  <LeaveDialog
                    slug={slug}
                    clubName={detail.name}
                    userId={user.id}
                  />
                ) : null}
              </DataRow>
            ))}
          </RowGroup>
        )}
      </SectionCard>
    </PageShell>
  );
}

function MemberIdentity({ member }: { member: ClubMemberDto }) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <Avatar className="size-9">
        {member.avatarUrl ? <AvatarImage src={member.avatarUrl} alt="" /> : null}
        <AvatarFallback>{initials(member.fullName)}</AvatarFallback>
      </Avatar>
      <Link
        to="/users/$id"
        params={{ id: member.userId }}
        className="truncate font-medium hover:underline"
      >
        {member.fullName}
      </Link>
    </div>
  );
}

function TransferDialog({
  slug,
  member,
}: {
  slug: string;
  member: ClubMemberDto;
}) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => transferLeader(slug, member.userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: clubKeys.all });
      void queryClient.invalidateQueries({
        queryKey: ["clubs", "members", slug],
      });
      setOpen(false);
      toast.add({
        title: `${member.fullName} now leads this club`,
        type: "success",
      });
    },
    onError: (error) => {
      toast.add({
        title: isApiError(error) ? error.message : "Could not transfer",
        type: "error",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <CrownIcon />
        Make leader
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Hand over leadership?</DialogTitle>
          <DialogDescription>
            {member.fullName} will take over every club and event power. You
            stay a member, but you cannot undo this yourself.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button
            disabled={mutation.isPending} loading={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Transferring" : "Transfer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LeaveDialog({
  slug,
  clubName,
  userId,
}: {
  slug: string;
  clubName: string;
  userId: string;
}) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => leaveClub(slug, userId),
    onSuccess: async () => {
      void queryClient.invalidateQueries({ queryKey: clubKeys.all });
      void queryClient.invalidateQueries({
        queryKey: ["clubs", "members", slug],
      });
      setOpen(false);
      toast.add({ title: `You left ${clubName}`, type: "success" });
      await navigate({ to: "/clubs/$slug", params: { slug }, replace: true });
    },
    onError: (error) => {
      toast.add({
        title: isApiError(error) ? error.message : "Could not leave the club",
        type: "error",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <UserMinusIcon />
        Leave
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Leave {clubName}?</DialogTitle>
          <DialogDescription>
            You lose access to its announcements and member list. You can ask to
            join again later.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Stay</DialogClose>
          <Button
            variant="destructive"
            disabled={mutation.isPending} loading={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Leaving" : "Leave club"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
