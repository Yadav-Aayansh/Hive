import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { EventRegistration } from "./EventRegistration";

@Entity("certificates")
export class Certificate {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid", name: "college_id" })
  collegeId!: string;

  @Column({ type: "uuid", name: "registration_id", unique: true })
  registrationId!: string;

  @Column({ type: "varchar", length: 32, unique: true })
  serial!: string;

  @Column({ type: "varchar", length: 255, name: "file_key", nullable: true })
  fileKey!: string | null;

  @CreateDateColumn({ type: "timestamptz", name: "issued_at" })
  issuedAt!: Date;

  @OneToOne(() => EventRegistration, { onDelete: "RESTRICT" })
  @JoinColumn([
    { name: "registration_id", referencedColumnName: "id" },
    { name: "college_id", referencedColumnName: "collegeId" },
  ])
  registration!: EventRegistration;
}
