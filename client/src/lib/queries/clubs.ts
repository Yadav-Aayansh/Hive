import { queryOptions } from "@tanstack/react-query";
import { api } from "../api";
import type {
  ClubCategory,
  ClubStatus,
  ClubType,
  MembershipRole,
  MembershipStatus,
} from "../constants";

export interface ViewerMembership {
  role: MembershipRole;
  status: MembershipStatus;
}

export interface ClubDto {
  id: string;
  name: string;
  slug: string;
  category: ClubCategory;
  description: string | null;
  logoUrl: string | null;
  type: ClubType;
  status: ClubStatus;
  memberCount: number;
  viewer: ViewerMembership | null;
}

export interface ClubLeaderDto {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
}

export interface ClubDetailDto extends ClubDto {
  leader: ClubLeaderDto | null;
}

export interface ClubListResult {
  clubs: ClubDto[];
  total: number;
  page: number;
  limit: number;
}

export interface ClubListParams {
  search?: string;
  category?: ClubCategory;
  type?: ClubType;
  status?: ClubStatus;
  mine?: boolean;
  sort: "name" | "newest";
  page: number;
}

export const clubKeys = {
  all: ["clubs"] as const,
  list: (params: ClubListParams) => ["clubs", "list", params] as const,
  detail: (slug: string) => ["clubs", "detail", slug] as const,
};

export function clubsQueryOptions(params: ClubListParams) {
  return queryOptions({
    queryKey: clubKeys.list(params),
    queryFn: ({ signal }) =>
      api.get<ClubListResult>("/clubs", {
        signal,
        params: {
          search: params.search,
          category: params.category,
          type: params.type,
          status: params.status,
          mine: params.mine ? true : undefined,
          sort: params.sort,
          page: params.page,
        },
      }),
  });
}

export function clubQueryOptions(slug: string) {
  return queryOptions({
    queryKey: clubKeys.detail(slug),
    queryFn: ({ signal }) =>
      api.get<{ club: ClubDetailDto }>(`/clubs/${slug}`, { signal }),
  });
}

export interface CreateClubInput {
  name: string;
  slug: string;
  category: ClubCategory;
  type: ClubType;
  description?: string;
  logoUploadId?: string;
}

export function createClub(input: CreateClubInput) {
  return api.post<{ club: ClubDto }>("/clubs", input);
}

export interface UpdateClubInput {
  name?: string;
  category?: ClubCategory;
  description?: string | null;
  logoUploadId?: string;
}

export function updateClub(slug: string, input: UpdateClubInput) {
  return api.patch<{ club: ClubDetailDto }>(`/clubs/${slug}`, input);
}

export function transferLeader(slug: string, userId: string) {
  return api.put<{ club: ClubDetailDto }>(`/clubs/${slug}/leader`, { userId });
}

export function removeMember(slug: string, userId: string): Promise<void> {
  return api.del(`/clubs/${slug}/members/${userId}`);
}

export function joinClub(slug: string): Promise<{ membership: ViewerMembership }> {
  return api.post<{ membership: ViewerMembership }>(`/clubs/${slug}/members`);
}

export function leaveClub(slug: string, userId: string): Promise<void> {
  return api.del(`/clubs/${slug}/members/${userId}`);
}

export interface ClubMemberDto {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  role: MembershipRole;
  status: MembershipStatus;
  requestedAt: string;
}

export function membersQueryOptions(slug: string) {
  return queryOptions({
    queryKey: ["clubs", "members", slug] as const,
    queryFn: ({ signal }) =>
      api.get<{ members: ClubMemberDto[] }>(`/clubs/${slug}/members`, {
        signal,
      }),
  });
}

export function decideClub(slug: string, status: "approved" | "rejected") {
  return api.patch<{ club: ClubDetailDto }>(`/clubs/${slug}/status`, { status });
}

export function decideMembership(
  slug: string,
  userId: string,
  status: "approved" | "rejected",
) {
  return api.patch<{ membership: ViewerMembership }>(
    `/clubs/${slug}/members/${userId}`,
    { status },
  );
}
