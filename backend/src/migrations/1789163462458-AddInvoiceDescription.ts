import { MigrationInterface, QueryRunner } from "typeorm";

export class AddInvoiceDescription1789163462458 implements MigrationInterface {
    name = 'AddInvoiceDescription1789163462458'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "invoices" ADD "description" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "invoices" DROP COLUMN "description"`);
    }

}
