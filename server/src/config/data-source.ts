import "reflect-metadata";
import "dotenv/config";
import { DataSource } from "typeorm";
import { Club } from "../entity/Club";
import { ClubMembership } from "../entity/ClubMembership";
import { College } from "../entity/College";
import { Student } from "../entity/Student";
import { User } from "../entity/User";

export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.POSTGRES_HOST,
  port: Number(process.env.POSTGRES_PORT),
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  entities: [College, User, Student, Club, ClubMembership],
  synchronize: true,
  logging: false,
});
