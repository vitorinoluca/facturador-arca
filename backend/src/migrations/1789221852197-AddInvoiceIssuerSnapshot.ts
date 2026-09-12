import { MigrationInterface, QueryRunner } from "typeorm";

export class AddInvoiceIssuerSnapshot1789221852197 implements MigrationInterface {
    name = 'AddInvoiceIssuerSnapshot1789221852197'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "invoices" ADD "issuerCuit" character varying`);
        await queryRunner.query(`ALTER TABLE "invoices" ADD "issuerBusinessName" character varying`);
        await queryRunner.query(`ALTER TABLE "invoices" ADD "issuerAddress" character varying`);
        await queryRunner.query(`ALTER TABLE "invoices" ADD "issuerGrossIncome" character varying`);
        await queryRunner.query(`ALTER TABLE "invoices" ADD "issuerActivityStartDate" date`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "invoices" DROP COLUMN "issuerActivityStartDate"`);
        await queryRunner.query(`ALTER TABLE "invoices" DROP COLUMN "issuerGrossIncome"`);
        await queryRunner.query(`ALTER TABLE "invoices" DROP COLUMN "issuerAddress"`);
        await queryRunner.query(`ALTER TABLE "invoices" DROP COLUMN "issuerBusinessName"`);
        await queryRunner.query(`ALTER TABLE "invoices" DROP COLUMN "issuerCuit"`);
    }

}
