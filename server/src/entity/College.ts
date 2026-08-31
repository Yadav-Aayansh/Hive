import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Club } from "./Club";
import { User } from "./User";

export type CollegeStatus = "pending" | "verified";

export const COLLEGE_PLANS = ["free", "pro"] as const;

export type CollegePlan = (typeof COLLEGE_PLANS)[number];

export const PLAN_LIMITS: Record<
  CollegePlan,
  { clubs: number | null; events: number | null }
> = {
  free: { clubs: 3, events: 10 },
  pro: { clubs: null, events: null },
};

@Check("chk_colleges_status", `"status" IN ('pending', 'verified')`)
@Check(
  "chk_colleges_plan",
  `"plan" IN (${COLLEGE_PLANS.map((p) => `'${p}'`).join(", ")})`,
)
@Check(
  "chk_colleges_plan_paid_at",
  `"plan" = 'free' OR "plan_paid_at" IS NOT NULL`,
)
@Entity("colleges")
export class College {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 160 })
  name!: string;

  @Column({ type: "text", nullable: true })
  description!: string | null;

  @Column({ type: "varchar", length: 190, unique: true })
  domain!: string;

  @Column({ type: "varchar", length: 60, unique: true })
  slug!: string;

  // R2 object key, not a URL. See User.avatarKey.
  @Column({ type: "varchar", length: 255, name: "logo_key", nullable: true })
  logoKey!: string | null;

  @Column({ type: "varchar", length: 20, default: "pending" })
  status!: CollegeStatus;

  @Column({ type: "varchar", length: 20, default: "free" })
  plan!: CollegePlan;

  @Column({ type: "timestamptz", name: "plan_paid_at", nullable: true })
  planPaidAt!: Date | null;

  @Column({
    type: "varchar",
    length: 64,
    name: "pending_order_id",
    nullable: true,
  })
  pendingOrderId!: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;

  @OneToMany(() => User, (user) => user.college)
  users!: User[];

  @OneToMany(() => Club, (club) => club.college)
  clubs!: Club[];
}
