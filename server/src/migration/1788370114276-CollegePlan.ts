import { MigrationInterface, QueryRunner } from "typeorm";

export class CollegePlan1788370114276 implements MigrationInterface {
    name = 'CollegePlan1788370114276'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "colleges" ADD "plan" character varying(20) NOT NULL DEFAULT 'free'`);
        await queryRunner.query(`ALTER TABLE "colleges" ADD "plan_paid_at" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "colleges" ADD "pending_order_id" character varying(64)`);
        await queryRunner.query(`ALTER TABLE "colleges" ADD CONSTRAINT "chk_colleges_plan_paid_at" CHECK ("plan" = 'free' OR "plan_paid_at" IS NOT NULL)`);
        await queryRunner.query(`ALTER TABLE "colleges" ADD CONSTRAINT "chk_colleges_plan" CHECK ("plan" IN ('free', 'pro'))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "colleges" DROP CONSTRAINT "chk_colleges_plan"`);
        await queryRunner.query(`ALTER TABLE "colleges" DROP CONSTRAINT "chk_colleges_plan_paid_at"`);
        await queryRunner.query(`ALTER TABLE "colleges" DROP COLUMN "pending_order_id"`);
        await queryRunner.query(`ALTER TABLE "colleges" DROP COLUMN "plan_paid_at"`);
        await queryRunner.query(`ALTER TABLE "colleges" DROP COLUMN "plan"`);
    }

}
