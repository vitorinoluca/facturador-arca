import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBusinessProfile1789159079356 implements MigrationInterface {
    name = 'AddBusinessProfile1789159079356'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "afip_credentials" ADD "businessName" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "afip_credentials" ADD "address" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "afip_credentials" ADD "grossIncome" character varying NOT NULL DEFAULT 'Exento'`);
        await queryRunner.query(`ALTER TABLE "afip_credentials" ADD "activityStartDate" date NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "afip_credentials" DROP COLUMN "activityStartDate"`);
        await queryRunner.query(`ALTER TABLE "afip_credentials" DROP COLUMN "grossIncome"`);
        await queryRunner.query(`ALTER TABLE "afip_credentials" DROP COLUMN "address"`);
        await queryRunner.query(`ALTER TABLE "afip_credentials" DROP COLUMN "businessName"`);
    }

}
