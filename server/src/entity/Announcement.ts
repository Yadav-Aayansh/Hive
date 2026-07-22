import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Club } from "./Club";
import { Student } from "./Student";

@Index("idx_announcements_club_created_at", ["clubId", "createdAt"])
@Entity("announcements")
export class Announcement {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid", name: "college_id" })
  collegeId!: string;

  @Column({ type: "uuid", name: "club_id" })
  clubId!: string;

  @Column({ type: "uuid", name: "author_id" })
  authorId!: string;

  @Column({ type: "varchar", length: 160 })
  title!: string;

  @Column({ type: "text" })
  body!: string;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;

  @ManyToOne(() => Club, { onDelete: "CASCADE" })
  @JoinColumn([
    { name: "club_id", referencedColumnName: "id" },
    { name: "college_id", referencedColumnName: "collegeId" },
  ])
  club!: Club;

  @ManyToOne(() => Student, { onDelete: "RESTRICT" })
  @JoinColumn([
    { name: "author_id", referencedColumnName: "userId" },
    { name: "college_id", referencedColumnName: "collegeId" },
  ])
  author!: Student;
}
