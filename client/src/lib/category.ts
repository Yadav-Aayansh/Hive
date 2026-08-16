import {
  BookOpenIcon,
  CodeIcon,
  CpuIcon,
  GraduationCapIcon,
  HeartHandshakeIcon,
  PaletteIcon,
  PresentationIcon,
  RocketIcon,
  SparklesIcon,
  SwordsIcon,
  TrophyIcon,
  WrenchIcon,
  type LucideIcon,
} from "lucide-react";
import type { ClubCategory, EventCategory } from "./constants";

export type Accent = "a1" | "a2" | "a3" | "a4" | "a5";

interface CategoryMeta {
  icon: LucideIcon;
  accent: Accent;
}

export const CLUB_CATEGORY_META: Record<ClubCategory, CategoryMeta> = {
  technical: { icon: CpuIcon, accent: "a4" },
  cultural: { icon: SparklesIcon, accent: "a1" },
  sports: { icon: TrophyIcon, accent: "a3" },
  academic: { icon: GraduationCapIcon, accent: "a5" },
  arts: { icon: PaletteIcon, accent: "a2" },
  literary: { icon: BookOpenIcon, accent: "a4" },
  entrepreneurship: { icon: RocketIcon, accent: "a3" },
  social_service: { icon: HeartHandshakeIcon, accent: "a2" },
};

export const EVENT_CATEGORY_META: Record<EventCategory, CategoryMeta> = {
  workshop: { icon: WrenchIcon, accent: "a2" },
  competition: { icon: SwordsIcon, accent: "a5" },
  seminar: { icon: PresentationIcon, accent: "a3" },
  cultural: { icon: SparklesIcon, accent: "a1" },
  sports: { icon: TrophyIcon, accent: "a4" },
  hackathon: { icon: CodeIcon, accent: "a5" },
};

const ACCENTS: Accent[] = ["a1", "a2", "a3", "a4", "a5"];

export function accentOf(key: string): Accent {
  let hash = 0;
  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 31 + key.charCodeAt(index)) % 1021;
  }
  return ACCENTS[hash % ACCENTS.length];
}
