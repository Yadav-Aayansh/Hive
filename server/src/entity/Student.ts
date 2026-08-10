import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryColumn,
  Unique,
  UpdateDateColumn,
} from "typeorm";
import { ClubMembership } from "./ClubMembership";
import { User } from "./User";

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

export type StudentBranch = (typeof STUDENT_BRANCHES)[number];

@Check(
  `"branch" IS NULL OR "branch" IN (${STUDENT_BRANCHES.map((b) => `'${b}'`).join(", ")})`,
)
@Unique("uq_students_user_college", ["userId", "collegeId"])
@Index("uq_students_college_roll", ["collegeId", "rollNo"], {
  unique: true,
  where: `"roll_no" IS NOT NULL`,
})
@Entity("students")
export class Student {
  @PrimaryColumn({ type: "uuid", name: "user_id" })
  userId!: string;

  @Index()
  @Column({ type: "uuid", name: "college_id" })
  collegeId!: string;

  @Column({ type: "varchar", length: 40, name: "roll_no", nullable: true })
  rollNo!: string | null;

  @Column({ type: "varchar", length: 40, nullable: true })
  branch!: StudentBranch | null;

  @Column({ type: "text", nullable: true })
  bio!: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;

  @OneToOne(() => User, (user) => user.student, { onDelete: "CASCADE" })
  @JoinColumn([
    { name: "user_id", referencedColumnName: "id" },
    { name: "college_id", referencedColumnName: "collegeId" },
  ])
  user!: User;

  @OneToMany(() => ClubMembership, (membership) => membership.student)
  memberships!: ClubMembership[];
}
