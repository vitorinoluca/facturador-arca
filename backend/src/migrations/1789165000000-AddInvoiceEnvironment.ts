import { MigrationInterface, QueryRunner } from "typeorm";

export class AddInvoiceEnvironment1789165000000 implements MigrationInterface {
    name = 'AddInvoiceEnvironment1789165000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "invoices" ADD "environment" character varying NOT NULL DEFAULT 'production'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "invoices" DROP COLUMN "environment"`);
    }

}
