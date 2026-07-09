import {
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

@Unique("uq_students_user_college", ["userId", "collegeId"])
@Entity("students")
export class Student {
  @PrimaryColumn({ type: "uuid", name: "user_id" })
  userId!: string;

  @Index()
  @Column({ type: "uuid", name: "college_id" })
  collegeId!: string;

  @OneToOne(() => User, (user) => user.student, { onDelete: "CASCADE" })
  @JoinColumn([
    { name: "user_id", referencedColumnName: "id" },
    { name: "college_id", referencedColumnName: "collegeId" },
  ])
  user!: User;

  @Column({ type: "varchar", length: 40, name: "roll_no" })
  rollNo!: string;

  @Column({ type: "varchar", length: 100 })
  branch!: string;

  @Column({ type: "text", nullable: true })
  bio!: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;

  @OneToMany(() => ClubMembership, (membership) => membership.student)
  memberships!: ClubMembership[];
}
