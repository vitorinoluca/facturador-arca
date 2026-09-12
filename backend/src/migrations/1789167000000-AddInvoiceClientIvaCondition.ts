import { MigrationInterface, QueryRunner } from "typeorm";

export class AddInvoiceClientIvaCondition1789167000000 implements MigrationInterface {
    name = 'AddInvoiceClientIvaCondition1789167000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "invoices" ADD "clientIvaCondition" character varying NOT NULL DEFAULT 'Consumidor Final'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "invoices" DROP COLUMN "clientIvaCondition"`);
    }

}
