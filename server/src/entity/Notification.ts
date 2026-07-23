import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { User } from "./User";

export type NotificationType =
  | "club_approved"
  | "club_rejected"
  | "join_requested"
  | "join_approved"
  | "join_rejected"
  | "event_published"
  | "event_cancelled"
  | "results_published"
  | "certificate_issued";

@Index("idx_notifications_user_read", ["userId", "readAt"])
@Entity("notifications")
export class Notification {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid", name: "user_id" })
  userId!: string;

  @Column({ type: "varchar", length: 40 })
  type!: NotificationType;

  @Column({ type: "varchar", length: 160 })
  title!: string;

  @Column({ type: "text", nullable: true })
  body!: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  link!: string | null;

  @Column({ type: "timestamptz", name: "read_at", nullable: true })
  readAt!: Date | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;
}
