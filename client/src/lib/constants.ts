export const CLUB_CATEGORIES = [
  "technical",
  "cultural",
  "sports",
  "academic",
  "arts",
  "literary",
  "entrepreneurship",
  "social_service",
] as const;

export const EVENT_CATEGORIES = [
  "workshop",
  "competition",
  "seminar",
  "cultural",
  "sports",
  "hackathon",
] as const;

export const RESULT_TYPES = ["participant", "runner_up", "winner"] as const;

export const NOTIFICATION_TYPES = [
  "club_approved",
  "club_rejected",
  "join_requested",
  "join_approved",
  "join_rejected",
  "event_published",
  "event_cancelled",
  "results_published",
  "announcement_posted",
] as const;

export const UPLOAD_PURPOSES = [
  "avatar",
  "college_logo",
  "club_logo",
  "event_banner",
] as const;

export const STUDENT_BRANCHES = [
  "computer_science",
  "information_technology",
  "electronics",
  "electrical",
  "mechanical",
  "civil",
  "chemical",
  "aerospace",
  "biotechnology",
  "data_science",
  "mathematics",
  "physics",
  "chemistry",
  "management",
  "humanities",
  "other",
] as const;

export const USER_ROLES = ["campus_admin", "student"] as const;

export const CLUB_TYPES = ["official", "unofficial"] as const;

export const CLUB_STATUSES = ["pending", "approved", "rejected"] as const;

export const EVENT_STATUSES = ["draft", "published", "cancelled"] as const;

export const MEMBERSHIP_ROLES = ["member", "leader"] as const;

export const MEMBERSHIP_STATUSES = ["pending", "approved", "rejected"] as const;

export const REGISTRATION_STATUSES = [
  "registered",
  "checked_in",
  "cancelled",
] as const;

export type ClubCategory = (typeof CLUB_CATEGORIES)[number];
export type EventCategory = (typeof EVENT_CATEGORIES)[number];
export type ResultType = (typeof RESULT_TYPES)[number];
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
export type UploadPurpose = (typeof UPLOAD_PURPOSES)[number];
export type StudentBranch = (typeof STUDENT_BRANCHES)[number];
export type UserRole = (typeof USER_ROLES)[number];
export type ClubType = (typeof CLUB_TYPES)[number];
export type ClubStatus = (typeof CLUB_STATUSES)[number];
export type EventStatus = (typeof EVENT_STATUSES)[number];
export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number];
export type MembershipRole = (typeof MEMBERSHIP_ROLES)[number];
export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number];
