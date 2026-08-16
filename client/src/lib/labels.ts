const OVERRIDES: Record<string, string> = {
  campus_admin: "Campus admin",
  checked_in: "Checked in",
  runner_up: "Runner up",
  social_service: "Social service",
  club_approved: "Club approved",
  club_rejected: "Club rejected",
  join_requested: "Join requested",
  join_approved: "Join approved",
  join_rejected: "Join rejected",
  event_published: "Event published",
  event_cancelled: "Event cancelled",
  results_published: "Results published",
  announcement_posted: "Announcement posted",
};

const POSITIVE = new Set([
  "approved",
  "published",
  "checked_in",
  "winner",
  "official",
  "verified",
]);

const NEGATIVE = new Set(["rejected", "cancelled"]);

export type StatusTone = "positive" | "negative" | "pending" | "neutral";

export function labelOf(value: string): string {
  const known = OVERRIDES[value];
  if (known) return known;

  const spaced = value.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function toneOf(value: string): StatusTone {
  if (POSITIVE.has(value)) return "positive";
  if (NEGATIVE.has(value)) return "negative";
  if (value === "pending") return "pending";
  return "neutral";
}
