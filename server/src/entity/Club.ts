import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from "typeorm";
import { ClubMembership } from "./ClubMembership";
import { College } from "./College";
import { Event } from "./Event";

export type ClubType = "official" | "unofficial";
export type ClubStatus = "pending" | "approved" | "rejected";

// A fixed list because the directory filters on it: free text turns `Tech`,
// `tech` and `Technology` into three categories and a filter that finds
// nothing. The Zod schema reads the same array, so there is one source.
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

export type ClubCategory = (typeof CLUB_CATEGORIES)[number];

@Unique("uq_clubs_college_slug", ["collegeId", "slug"])
@Unique("uq_clubs_id_college", ["id", "collegeId"])
@Check("chk_clubs_type", `"type" IN ('official', 'unofficial')`)
@Check("chk_clubs_status", `"status" IN ('pending', 'approved', 'rejected')`)
@Check(
  "chk_clubs_unofficial_approved",
  `"type" = 'official' OR "status" = 'approved'`,
)
@Check(
  "chk_clubs_category",
  `"category" IN (${CLUB_CATEGORIES.map((c) => `'${c}'`).join(", ")})`,
)
@Entity("clubs")
export class Club {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid", name: "college_id" })
  collegeId!: string;

  @Column({ type: "varchar", length: 120 })
  name!: string;

  @Column({ type: "varchar", length: 60 })
  slug!: string;

  @Column({ type: "varchar", length: 60 })
  category!: ClubCategory;

  @Column({ type: "text", nullable: true })
  description!: string | null;

  // R2 object key, not a URL. See User.avatarKey.
  @Column({ type: "varchar", length: 255, name: "logo_key", nullable: true })
  logoKey!: string | null;

  @Column({ type: "varchar", length: 20, default: "unofficial" })
  type!: ClubType;

  // No default: the valid value depends on `type`, so the service sets it.
  @Column({ type: "varchar", length: 20 })
  status!: ClubStatus;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;

  @ManyToOne(() => College, (college) => college.clubs, {
    onDelete: "RESTRICT",
  })
  @JoinColumn({ name: "college_id" })
  college!: College;

  @OneToMany(() => ClubMembership, (membership) => membership.club)
  memberships!: ClubMembership[];

  @OneToMany(() => Event, (event) => event.club)
  events!: Event[];
}
