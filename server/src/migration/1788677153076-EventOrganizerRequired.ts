import { MigrationInterface, QueryRunner } from "typeorm";

export class EventOrganizerRequired1788677153076 implements MigrationInterface {
    name = 'EventOrganizerRequired1788677153076'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`UPDATE "events" e SET "organizer_id" = m."student_id" FROM "club_memberships" m WHERE e."organizer_id" IS NULL AND e."status" <> 'draft' AND m."club_id" = e."club_id" AND m."role" = 'leader' AND m."status" = 'approved'`);
        await queryRunner.query(`ALTER TABLE "events" ADD CONSTRAINT "chk_events_published_has_organizer" CHECK ("organizer_id" IS NOT NULL OR "status" = 'draft')`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "events" DROP CONSTRAINT "chk_events_published_has_organizer"`);
    }

}
