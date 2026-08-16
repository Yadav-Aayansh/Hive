import { EVENT_CATEGORIES } from "./constants";
import { labelOf } from "./labels";

export const CATEGORY_ITEMS = EVENT_CATEGORIES.map((value) => ({
  value,
  label: labelOf(value),
}));

export interface EventFormValues {
  clubSlug: string;
  title: string;
  slug: string;
  category: (typeof EVENT_CATEGORIES)[number];
  description: string;
  venue: string;
  startsAt: string;
  endsAt: string;
  capacity: string;
}

export function toIso(value: string): string | null {
  return value === "" ? null : new Date(value).toISOString();
}

export function toLocalInput(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}
