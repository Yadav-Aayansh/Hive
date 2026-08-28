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

@Check("chk_colleges_status", `"status" IN ('pending', 'verified')`)
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

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;

  @OneToMany(() => User, (user) => user.college)
  users!: User[];

  @OneToMany(() => Club, (club) => club.college)
  clubs!: Club[];
}
