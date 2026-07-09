import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from "typeorm";
import { College } from "./College";
import { Student } from "./Student";

export type UserRole = "campus_admin" | "student";

@Check(`"role" IN ('campus_admin', 'student')`)
@Check(`"role" <> 'student' OR "college_id" IS NOT NULL`)
@Unique("uq_users_id_college", ["id", "collegeId"])
@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid", name: "college_id", nullable: true })
  collegeId!: string | null;

  @ManyToOne(() => College, (college) => college.users, {
    nullable: true,
    onDelete: "RESTRICT",
  })
  @JoinColumn({ name: "college_id" })
  college!: College | null;

  @Column({ type: "varchar", length: 190, unique: true })
  email!: string;

  @Column({ type: "varchar", length: 255, name: "password_hash", select: false })
  passwordHash!: string;

  @Column({ type: "varchar", length: 120, name: "full_name" })
  fullName!: string;

  @Column({ type: "text", name: "avatar_url", nullable: true })
  avatarUrl!: string | null;

  @Column({ type: "varchar", length: 20 })
  role!: UserRole;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;

  @OneToOne(() => Student, (student) => student.user)
  student!: Student | null;
}
