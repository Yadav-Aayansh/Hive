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

@Unique("uq_clubs_college_slug", ["collegeId", "slug"])
@Unique("uq_clubs_id_college", ["id", "collegeId"])
@Check(`"type" IN ('official', 'unofficial')`)
@Check(`"status" IN ('pending', 'approved', 'rejected')`)
@Check(`"type" = 'official' OR "status" = 'approved'`)
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
  category!: string;

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
