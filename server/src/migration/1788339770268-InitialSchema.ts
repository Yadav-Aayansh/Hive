import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1788339770268 implements MigrationInterface {
    name = 'InitialSchema1788339770268'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
        await queryRunner.query(`CREATE TABLE "colleges" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(160) NOT NULL, "description" text, "domain" character varying(190) NOT NULL, "slug" character varying(60) NOT NULL, "logo_key" character varying(255), "status" character varying(20) NOT NULL DEFAULT 'pending', "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_41a68cd880b772cac5c009905c2" UNIQUE ("domain"), CONSTRAINT "UQ_f34962466cf98f7a31019b7882c" UNIQUE ("slug"), CONSTRAINT "chk_colleges_status" CHECK ("status" IN ('pending', 'verified')), CONSTRAINT "PK_61a64e7dc0b7c9d5e433284037c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "college_id" uuid, "email" character varying(190) NOT NULL, "password_hash" character varying(255) NOT NULL, "full_name" character varying(120) NOT NULL, "avatar_key" character varying(255), "role" character varying(20) NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "uq_users_id_college" UNIQUE ("id", "college_id"), CONSTRAINT "chk_users_student_has_college" CHECK ("role" <> 'student' OR "college_id" IS NOT NULL), CONSTRAINT "chk_users_role" CHECK ("role" IN ('campus_admin', 'student')), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_064c1a873d0a977909ff61e6d6" ON "users"  ("college_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "uq_one_admin_per_college" ON "users"  ("college_id") WHERE "role" = 'campus_admin' AND "college_id" IS NOT NULL`);
        await queryRunner.query(`CREATE TABLE "students" ("user_id" uuid NOT NULL, "college_id" uuid NOT NULL, "roll_no" character varying(40), "branch" character varying(40), "bio" text, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "uq_students_user_college" UNIQUE ("user_id", "college_id"), CONSTRAINT "REL_7986dbe09a65eda0a75e17dc64" UNIQUE ("user_id", "college_id"), CONSTRAINT "chk_students_branch" CHECK ("branch" IS NULL OR "branch" IN ('computer_science', 'information_technology', 'electronics', 'electrical', 'mechanical', 'civil', 'chemical', 'aerospace', 'biotechnology', 'data_science', 'mathematics', 'physics', 'chemistry', 'management', 'humanities', 'other')), CONSTRAINT "PK_fb3eff90b11bddf7285f9b4e281" PRIMARY KEY ("user_id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_1f4ec087094a2e63fb2e5e5031" ON "students"  ("college_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "uq_students_college_roll" ON "students"  ("college_id", "roll_no") WHERE "roll_no" IS NOT NULL`);
        await queryRunner.query(`ALTER TABLE "students" ADD CONSTRAINT "REL_7986dbe09a65eda0a75e17dc64" UNIQUE ("user_id", "college_id")`);
        await queryRunner.query(`CREATE TABLE "club_memberships" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "college_id" uuid NOT NULL, "club_id" uuid NOT NULL, "student_id" uuid NOT NULL, "role" character varying(20) NOT NULL DEFAULT 'member', "status" character varying(20) NOT NULL DEFAULT 'pending', "requested_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "decided_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "uq_memberships_club_student" UNIQUE ("club_id", "student_id"), CONSTRAINT "chk_memberships_decided_at" CHECK ("status" = 'pending' OR "decided_at" IS NOT NULL), CONSTRAINT "chk_memberships_status" CHECK ("status" IN ('pending', 'approved', 'rejected')), CONSTRAINT "chk_memberships_role" CHECK ("role" IN ('member', 'leader')), CONSTRAINT "PK_9477d0dd52aeb1544fa933dcdd8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_3cdab857501d19fc3019b54ea8" ON "club_memberships"  ("student_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "uq_memberships_club_leader" ON "club_memberships"  ("club_id") WHERE "role" = 'leader' AND "status" = 'approved'`);
        await queryRunner.query(`CREATE TABLE "event_registrations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "college_id" uuid NOT NULL, "event_id" uuid NOT NULL, "student_id" uuid NOT NULL, "status" character varying(20) NOT NULL DEFAULT 'registered', "result" character varying(20), "registered_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "checked_in_at" TIMESTAMP WITH TIME ZONE, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "uq_registrations_id_college" UNIQUE ("id", "college_id"), CONSTRAINT "uq_registrations_event_student" UNIQUE ("event_id", "student_id"), CONSTRAINT "chk_registrations_result_needs_checkin" CHECK ("result" IS NULL OR "status" = 'checked_in'), CONSTRAINT "chk_registrations_checked_in_at" CHECK ("status" <> 'checked_in' OR "checked_in_at" IS NOT NULL), CONSTRAINT "chk_registrations_result" CHECK ("result" IS NULL OR "result" IN ('participant', 'runner_up', 'winner')), CONSTRAINT "chk_registrations_status" CHECK ("status" IN ('registered', 'checked_in', 'cancelled')), CONSTRAINT "PK_953d3b862c2487289a92b2356e9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_e935037eb6518577bf6c9dae26" ON "event_registrations"  ("student_id") `);
        await queryRunner.query(`CREATE TABLE "events" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "college_id" uuid NOT NULL, "club_id" uuid NOT NULL, "organizer_id" uuid, "title" character varying(160) NOT NULL, "slug" character varying(120) NOT NULL, "description" text, "category" character varying(60) NOT NULL, "starts_at" TIMESTAMP WITH TIME ZONE, "ends_at" TIMESTAMP WITH TIME ZONE, "capacity" integer, "venue" character varying(160), "banner_key" character varying(255), "status" character varying(20) NOT NULL DEFAULT 'draft', "checkin_opened_at" TIMESTAMP WITH TIME ZONE, "results_published_at" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "uq_events_college_slug" UNIQUE ("college_id", "slug"), CONSTRAINT "uq_events_id_college" UNIQUE ("id", "college_id"), CONSTRAINT "chk_events_results_after_checkin" CHECK ("results_published_at" IS NULL OR ("status" = 'published' AND "checkin_opened_at" IS NOT NULL)), CONSTRAINT "chk_events_checkin_not_draft" CHECK ("checkin_opened_at" IS NULL OR "status" <> 'draft'), CONSTRAINT "chk_events_published_has_times" CHECK (("starts_at" IS NOT NULL AND "ends_at" IS NOT NULL) OR "status" = 'draft'), CONSTRAINT "chk_events_time_order" CHECK ("starts_at" < "ends_at"), CONSTRAINT "chk_events_capacity" CHECK ("capacity" IS NULL OR "capacity" > 0), CONSTRAINT "chk_events_category" CHECK ("category" IN ('workshop', 'competition', 'seminar', 'cultural', 'sports', 'hackathon')), CONSTRAINT "chk_events_status" CHECK ("status" IN ('draft', 'published', 'cancelled')), CONSTRAINT "PK_40731c7151fe4be3116e45ddf73" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_d54bb512a9336aa807b92d4505" ON "events"  ("club_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_14c9ce53a2c2a1c781b8390123" ON "events"  ("organizer_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_da080c835c9fc4e0aa5e8fe264" ON "events"  ("starts_at") `);
        await queryRunner.query(`CREATE INDEX "idx_events_college_starts_at" ON "events"  ("college_id", "starts_at") `);
        await queryRunner.query(`CREATE TABLE "clubs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "college_id" uuid NOT NULL, "name" character varying(120) NOT NULL, "slug" character varying(60) NOT NULL, "category" character varying(60) NOT NULL, "description" text, "logo_key" character varying(255), "type" character varying(20) NOT NULL DEFAULT 'unofficial', "status" character varying(20) NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "uq_clubs_id_college" UNIQUE ("id", "college_id"), CONSTRAINT "uq_clubs_college_slug" UNIQUE ("college_id", "slug"), CONSTRAINT "chk_clubs_category" CHECK ("category" IN ('technical', 'cultural', 'sports', 'academic', 'arts', 'literary', 'entrepreneurship', 'social_service')), CONSTRAINT "chk_clubs_unofficial_approved" CHECK ("type" = 'official' OR "status" = 'approved'), CONSTRAINT "chk_clubs_status" CHECK ("status" IN ('pending', 'approved', 'rejected')), CONSTRAINT "chk_clubs_type" CHECK ("type" IN ('official', 'unofficial')), CONSTRAINT "PK_bb09bd0c8d5238aeaa8f86ee0d4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "announcements" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "college_id" uuid NOT NULL, "club_id" uuid NOT NULL, "author_id" uuid NOT NULL, "title" character varying(160) NOT NULL, "body" text NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_b3ad760876ff2e19d58e05dc8b0" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_announcements_club_created_at" ON "announcements"  ("club_id", "createdAt") `);
        await queryRunner.query(`CREATE TABLE "certificates" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "college_id" uuid NOT NULL, "registration_id" uuid NOT NULL, "serial" character varying(32) NOT NULL, "file_key" character varying(255), "issued_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_2709475ae00f4c6d19b976e3d9e" UNIQUE ("registration_id"), CONSTRAINT "UQ_87af1f436e42688acef033da093" UNIQUE ("serial"), CONSTRAINT "REL_05ed92d0539adaef3c21cd3349" UNIQUE ("registration_id", "college_id"), CONSTRAINT "PK_e4c7e31e2144300bea7d89eb165" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "notifications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "type" character varying(40) NOT NULL, "title" character varying(160) NOT NULL, "body" text, "link" character varying(255), "read_at" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "chk_notifications_type" CHECK ("type" IN ('club_approved', 'club_rejected', 'join_requested', 'join_approved', 'join_rejected', 'event_published', 'event_cancelled', 'results_published', 'announcement_posted')), CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_notifications_user_read" ON "notifications"  ("user_id", "read_at") `);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_064c1a873d0a977909ff61e6d6b" FOREIGN KEY ("college_id") REFERENCES "colleges"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "students" ADD CONSTRAINT "FK_7986dbe09a65eda0a75e17dc649" FOREIGN KEY ("user_id", "college_id") REFERENCES "users"("id","college_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "club_memberships" ADD CONSTRAINT "FK_f7c2f76ef21abcc5ec7f2bc30b8" FOREIGN KEY ("club_id", "college_id") REFERENCES "clubs"("id","college_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "club_memberships" ADD CONSTRAINT "FK_dc659f7952234552652c5e41f8a" FOREIGN KEY ("student_id", "college_id") REFERENCES "students"("user_id","college_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "event_registrations" ADD CONSTRAINT "FK_6a03c918742a6006630979712ae" FOREIGN KEY ("college_id") REFERENCES "colleges"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "event_registrations" ADD CONSTRAINT "FK_344351251660e55df82ba350713" FOREIGN KEY ("event_id", "college_id") REFERENCES "events"("id","college_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "event_registrations" ADD CONSTRAINT "FK_1eb687eea99b34c0fae5b5db094" FOREIGN KEY ("student_id", "college_id") REFERENCES "students"("user_id","college_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "events" ADD CONSTRAINT "FK_e81aefe8e1b7c793206254b41a5" FOREIGN KEY ("college_id") REFERENCES "colleges"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "events" ADD CONSTRAINT "FK_ad6e64a044a942a795e180befd9" FOREIGN KEY ("club_id", "college_id") REFERENCES "clubs"("id","college_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "events" ADD CONSTRAINT "FK_7dfc62ffb2ef4138e55af6a3460" FOREIGN KEY ("organizer_id", "college_id") REFERENCES "students"("user_id","college_id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "clubs" ADD CONSTRAINT "FK_dcc2e4e2e8f9567f39d23296568" FOREIGN KEY ("college_id") REFERENCES "colleges"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "announcements" ADD CONSTRAINT "FK_1dc8fd45e16fe12ff55df72346a" FOREIGN KEY ("club_id", "college_id") REFERENCES "clubs"("id","college_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "announcements" ADD CONSTRAINT "FK_d780c6a9861a893b8a1ca4d8aae" FOREIGN KEY ("author_id", "college_id") REFERENCES "students"("user_id","college_id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "certificates" ADD CONSTRAINT "FK_05ed92d0539adaef3c21cd33491" FOREIGN KEY ("registration_id", "college_id") REFERENCES "event_registrations"("id","college_id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "FK_9a8a82462cab47c73d25f49261f" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_9a8a82462cab47c73d25f49261f"`);
        await queryRunner.query(`ALTER TABLE "certificates" DROP CONSTRAINT "FK_05ed92d0539adaef3c21cd33491"`);
        await queryRunner.query(`ALTER TABLE "announcements" DROP CONSTRAINT "FK_d780c6a9861a893b8a1ca4d8aae"`);
        await queryRunner.query(`ALTER TABLE "announcements" DROP CONSTRAINT "FK_1dc8fd45e16fe12ff55df72346a"`);
        await queryRunner.query(`ALTER TABLE "clubs" DROP CONSTRAINT "FK_dcc2e4e2e8f9567f39d23296568"`);
        await queryRunner.query(`ALTER TABLE "events" DROP CONSTRAINT "FK_7dfc62ffb2ef4138e55af6a3460"`);
        await queryRunner.query(`ALTER TABLE "events" DROP CONSTRAINT "FK_ad6e64a044a942a795e180befd9"`);
        await queryRunner.query(`ALTER TABLE "events" DROP CONSTRAINT "FK_e81aefe8e1b7c793206254b41a5"`);
        await queryRunner.query(`ALTER TABLE "event_registrations" DROP CONSTRAINT "FK_1eb687eea99b34c0fae5b5db094"`);
        await queryRunner.query(`ALTER TABLE "event_registrations" DROP CONSTRAINT "FK_344351251660e55df82ba350713"`);
        await queryRunner.query(`ALTER TABLE "event_registrations" DROP CONSTRAINT "FK_6a03c918742a6006630979712ae"`);
        await queryRunner.query(`ALTER TABLE "club_memberships" DROP CONSTRAINT "FK_dc659f7952234552652c5e41f8a"`);
        await queryRunner.query(`ALTER TABLE "club_memberships" DROP CONSTRAINT "FK_f7c2f76ef21abcc5ec7f2bc30b8"`);
        await queryRunner.query(`ALTER TABLE "students" DROP CONSTRAINT "FK_7986dbe09a65eda0a75e17dc649"`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_064c1a873d0a977909ff61e6d6b"`);
        await queryRunner.query(`DROP INDEX "public"."idx_notifications_user_read"`);
        await queryRunner.query(`DROP TABLE "notifications"`);
        await queryRunner.query(`DROP TABLE "certificates"`);
        await queryRunner.query(`DROP INDEX "public"."idx_announcements_club_created_at"`);
        await queryRunner.query(`DROP TABLE "announcements"`);
        await queryRunner.query(`DROP TABLE "clubs"`);
        await queryRunner.query(`DROP INDEX "public"."idx_events_college_starts_at"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_da080c835c9fc4e0aa5e8fe264"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_14c9ce53a2c2a1c781b8390123"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d54bb512a9336aa807b92d4505"`);
        await queryRunner.query(`DROP TABLE "events"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e935037eb6518577bf6c9dae26"`);
        await queryRunner.query(`DROP TABLE "event_registrations"`);
        await queryRunner.query(`DROP INDEX "public"."uq_memberships_club_leader"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3cdab857501d19fc3019b54ea8"`);
        await queryRunner.query(`DROP TABLE "club_memberships"`);
        await queryRunner.query(`ALTER TABLE "students" DROP CONSTRAINT "REL_7986dbe09a65eda0a75e17dc64"`);
        await queryRunner.query(`DROP INDEX "public"."uq_students_college_roll"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_1f4ec087094a2e63fb2e5e5031"`);
        await queryRunner.query(`DROP TABLE "students"`);
        await queryRunner.query(`DROP INDEX "public"."uq_one_admin_per_college"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_064c1a873d0a977909ff61e6d6"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TABLE "colleges"`);
    }

}
