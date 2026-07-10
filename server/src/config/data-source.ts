import "reflect-metadata";
import { DataSource } from "typeorm";
import { Club } from "../entity/Club";
import { ClubMembership } from "../entity/ClubMembership";
import { College } from "../entity/College";
import { Student } from "../entity/Student";
import { User } from "../entity/User";
import { env } from "./env";

export const AppDataSource = new DataSource({
  type: "postgres",
  host: env.POSTGRES_HOST,
  port: env.POSTGRES_PORT,
  username: env.POSTGRES_USER,
  password: env.POSTGRES_PASSWORD,
  database: env.POSTGRES_DB,
  entities: [User, Student, College, Club, ClubMembership],
  synchronize: true,
  logging: false,
});
