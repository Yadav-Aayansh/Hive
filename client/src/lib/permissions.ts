import type { ClubDto } from "./queries/clubs";
import type { EventDto } from "./queries/events";
import type { UserDto } from "./queries/me";

export function isAdmin(user: UserDto): boolean {
  return user.role === "campus_admin";
}

export function isStudent(user: UserDto): boolean {
  return user.role === "student";
}

export function isApprovedMember(club: ClubDto): boolean {
  return club.viewer?.status === "approved";
}

export function isClubLeader(club: ClubDto): boolean {
  return club.viewer?.role === "leader" && club.viewer.status === "approved";
}

export function canCreateClub(user: UserDto): boolean {
  return isStudent(user);
}

export function canEditClub(user: UserDto, club: ClubDto): boolean {
  return isStudent(user) && isClubLeader(club);
}

export function canDecideClub(user: UserDto, club: ClubDto): boolean {
  return isAdmin(user) && club.type === "official" && club.status === "pending";
}

export function canTransferLeader(user: UserDto, club: ClubDto): boolean {
  if (isAdmin(user)) return club.type === "official";
  return isClubLeader(club);
}

export function canSeeMembers(user: UserDto, club: ClubDto): boolean {
  if (isAdmin(user)) return club.type === "official";
  return isApprovedMember(club);
}

export function canManageMembers(user: UserDto, club: ClubDto): boolean {
  return isStudent(user) && isClubLeader(club);
}

export function canJoinClub(user: UserDto, club: ClubDto): boolean {
  return (
    isStudent(user) && club.status === "approved" && club.viewer?.status !== "approved"
  );
}

export function canLeaveClub(user: UserDto, club: ClubDto): boolean {
  return isStudent(user) && isApprovedMember(club) && !isClubLeader(club);
}

export function canCreateEvent(user: UserDto): boolean {
  return isStudent(user);
}

export function canEditEvent(user: UserDto, event: EventDto): boolean {
  return isStudent(user) && event.viewer.manages && event.status !== "cancelled";
}

export function canRunEvent(user: UserDto, event: EventDto): boolean {
  return isStudent(user) && (event.viewer.manages || event.viewer.isOrganizer);
}

function hasNoActiveSeat(event: EventDto): boolean {
  const registration = event.viewer.registration;
  return registration === null || registration.status === "cancelled";
}

export function canRegister(user: UserDto, event: EventDto): boolean {
  return (
    isStudent(user) &&
    event.status === "published" &&
    event.viewer.membership === "approved" &&
    hasNoActiveSeat(event)
  );
}

export function canCancelRegistration(user: UserDto, event: EventDto): boolean {
  return (
    isStudent(user) &&
    event.viewer.registration?.status === "registered" &&
    event.status === "published"
  );
}

export function needsMembershipToRegister(
  user: UserDto,
  event: EventDto,
): boolean {
  return (
    isStudent(user) &&
    event.status === "published" &&
    event.viewer.membership !== "approved" &&
    hasNoActiveSeat(event)
  );
}
