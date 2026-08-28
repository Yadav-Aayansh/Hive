import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from "typeorm";
import { Club } from "./Club";
import { College } from "./College";
import { EventRegistration } from "./EventRegistration";
import { Student } from "./Student";

export type EventStatus = "draft" | "published" | "cancelled";

export const EVENT_CATEGORIES = [
  "workshop",
  "competition",
  "seminar",
  "cultural",
  "sports",
  "hackathon",
] as const;

export type EventCategory = (typeof EVENT_CATEGORIES)[number];

@Unique("uq_events_id_college", ["id", "collegeId"])
@Unique("uq_events_college_slug", ["collegeId", "slug"])
@Index("idx_events_college_starts_at", ["collegeId", "startsAt"])
@Check("chk_events_status", `"status" IN ('draft', 'published', 'cancelled')`)
@Check(
  "chk_events_category",
  `"category" IN (${EVENT_CATEGORIES.map((c) => `'${c}'`).join(", ")})`,
)
@Check("chk_events_capacity", `"capacity" IS NULL OR "capacity" > 0`)
@Check("chk_events_time_order", `"starts_at" < "ends_at"`)
@Check(
  "chk_events_published_has_times",
  `("starts_at" IS NOT NULL AND "ends_at" IS NOT NULL) OR "status" = 'draft'`,
)
@Check(
  "chk_events_checkin_not_draft",
  `"checkin_opened_at" IS NULL OR "status" <> 'draft'`,
)
@Check(
  "chk_events_results_after_checkin",
  `"results_published_at" IS NULL OR ("status" = 'published' AND "checkin_opened_at" IS NOT NULL)`,
)
@Entity("events")
export class Event {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid", name: "college_id" })
  collegeId!: string;

  @Index()
  @Column({ type: "uuid", name: "club_id" })
  clubId!: string;

  @Index()
  @Column({ type: "uuid", name: "organizer_id", nullable: true })
  organizerId!: string | null;

  @Column({ type: "varchar", length: 160 })
  title!: string;

  @Column({ type: "varchar", length: 120 })
  slug!: string;

  @Column({ type: "text", nullable: true })
  description!: string | null;

  @Column({ type: "varchar", length: 60 })
  category!: EventCategory;

  @Index()
  @Column({ type: "timestamptz", name: "starts_at", nullable: true })
  startsAt!: Date | null;

  @Column({ type: "timestamptz", name: "ends_at", nullable: true })
  endsAt!: Date | null;

  @Column({ type: "int", nullable: true })
  capacity!: number | null;

  @Column({ type: "varchar", length: 160, nullable: true })
  venue!: string | null;

  @Column({ type: "varchar", length: 255, name: "banner_key", nullable: true })
  bannerKey!: string | null;

  @Column({ type: "varchar", length: 20, default: "draft" })
  status!: EventStatus;

  @Column({ type: "timestamptz", name: "checkin_opened_at", nullable: true })
  checkinOpenedAt!: Date | null;

  @Column({ type: "timestamptz", name: "results_published_at", nullable: true })
  resultsPublishedAt!: Date | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;

  @ManyToOne(() => College, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "college_id" })
  college!: College;

  @ManyToOne(() => Club, (club) => club.events, { onDelete: "CASCADE" })
  @JoinColumn([
    { name: "club_id", referencedColumnName: "id" },
    { name: "college_id", referencedColumnName: "collegeId" },
  ])
  club!: Club;

  @ManyToOne(() => Student, { nullable: true, onDelete: "RESTRICT" })
  @JoinColumn([
    { name: "organizer_id", referencedColumnName: "userId" },
    { name: "college_id", referencedColumnName: "collegeId" },
  ])
  organizer!: Student | null;

  @OneToMany(() => EventRegistration, (registration) => registration.event)
  registrations!: EventRegistration[];
}
