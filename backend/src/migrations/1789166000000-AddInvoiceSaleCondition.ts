import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInvoiceSaleCondition1789166000000 implements MigrationInterface {
  name = 'AddInvoiceSaleCondition1789166000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "invoices" ADD "saleCondition" character varying NOT NULL DEFAULT 'Contado'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "invoices" DROP COLUMN "saleCondition"`,
    );
  }
}
