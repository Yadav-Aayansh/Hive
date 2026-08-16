import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const backLinkClass =
  "inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground";

export const stretchedLinkClass =
  "absolute inset-0 rounded-2xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";

export function initials(name?: string): string {
  if (!name) return "";
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}
