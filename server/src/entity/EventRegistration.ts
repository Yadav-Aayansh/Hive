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
  UpdateDateColumn,
} from "typeorm";
import { College } from "./College";
import { Event } from "./Event";
import { Student } from "./Student";

export type RegistrationStatus = "registered" | "checked_in" | "cancelled";
export type ResultType = "participant" | "runner_up" | "winner";

@Unique("uq_registrations_event_student", ["eventId", "studentId"])
@Unique("uq_registrations_id_college", ["id", "collegeId"])
@Check(`"status" IN ('registered', 'checked_in', 'cancelled')`)
@Check(`"result" IS NULL OR "result" IN ('participant', 'runner_up', 'winner')`)
@Check(`"status" <> 'checked_in' OR "checked_in_at" IS NOT NULL`)
@Check(`"result" IS NULL OR "status" = 'checked_in'`)
@Entity("event_registrations")
export class EventRegistration {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid", name: "college_id" })
  collegeId!: string;

  @Column({ type: "uuid", name: "event_id" })
  eventId!: string;

  @Index()
  @Column({ type: "uuid", name: "student_id" })
  studentId!: string;

  @Column({ type: "varchar", length: 20, default: "registered" })
  status!: RegistrationStatus;

  @Column({ type: "varchar", length: 20, nullable: true })
  result!: ResultType | null;

  @CreateDateColumn({ type: "timestamptz", name: "registered_at" })
  registeredAt!: Date;

  @Column({ type: "timestamptz", name: "checked_in_at", nullable: true })
  checkedInAt!: Date | null;

  @UpdateDateColumn({ type: "timestamptz", name: "updated_at" })
  updatedAt!: Date;

  @ManyToOne(() => College, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "college_id" })
  college!: College;

  @ManyToOne(() => Event, (event) => event.registrations, {
    onDelete: "CASCADE",
  })
  @JoinColumn([
    { name: "event_id", referencedColumnName: "id" },
    { name: "college_id", referencedColumnName: "collegeId" },
  ])
  event!: Event;

  @ManyToOne(() => Student, { onDelete: "CASCADE" })
  @JoinColumn([
    { name: "student_id", referencedColumnName: "userId" },
    { name: "college_id", referencedColumnName: "collegeId" },
  ])
  student!: Student;
}
