import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";
import { Club } from "./Club";
import { Student } from "./Student";

export type MembershipRole = "member" | "leader";
export type MembershipStatus = "pending" | "approved" | "rejected";

@Unique("uq_memberships_club_student", ["clubId", "studentId"])
@Index("uq_memberships_club_leader", ["clubId"], {
  unique: true,
  where: `"role" = 'leader' AND "status" = 'approved'`,
})
@Check(`"role" IN ('member', 'leader')`)
@Check(`"status" IN ('pending', 'approved', 'rejected')`)
@Check(`"status" = 'pending' OR "decided_at" IS NOT NULL`)
@Entity("club_memberships")
export class ClubMembership {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid", name: "college_id" })
  collegeId!: string;

  @Column({ type: "uuid", name: "club_id" })
  clubId!: string;

  @Index()
  @Column({ type: "uuid", name: "student_id" })
  studentId!: string;

  @Column({ type: "varchar", length: 20, default: "member" })
  role!: MembershipRole;

  @Column({ type: "varchar", length: 20, default: "pending" })
  status!: MembershipStatus;

  @CreateDateColumn({ type: "timestamptz", name: "requested_at" })
  requestedAt!: Date;

  @Column({ type: "timestamptz", name: "decided_at", nullable: true })
  decidedAt!: Date | null;

  @ManyToOne(() => Club, (club) => club.memberships, { onDelete: "CASCADE" })
  @JoinColumn([
    { name: "club_id", referencedColumnName: "id" },
    { name: "college_id", referencedColumnName: "collegeId" },
  ])
  club!: Club;

  @ManyToOne(() => Student, (student) => student.memberships, {
    onDelete: "CASCADE",
  })
  @JoinColumn([
    { name: "student_id", referencedColumnName: "userId" },
    { name: "college_id", referencedColumnName: "collegeId" },
  ])
  student!: Student;
}
