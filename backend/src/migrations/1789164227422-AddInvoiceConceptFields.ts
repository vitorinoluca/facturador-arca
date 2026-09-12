import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInvoiceConceptFields1789164227422 implements MigrationInterface {
  name = 'AddInvoiceConceptFields1789164227422';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "invoices" ADD "concept" integer NOT NULL DEFAULT '1'`,
    );
    await queryRunner.query(
      `ALTER TABLE "invoices" ADD "serviceDateFrom" date`,
    );
    await queryRunner.query(`ALTER TABLE "invoices" ADD "serviceDateTo" date`);
    await queryRunner.query(`ALTER TABLE "invoices" ADD "paymentDueDate" date`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "invoices" DROP COLUMN "paymentDueDate"`,
    );
    await queryRunner.query(
      `ALTER TABLE "invoices" DROP COLUMN "serviceDateTo"`,
    );
    await queryRunner.query(
      `ALTER TABLE "invoices" DROP COLUMN "serviceDateFrom"`,
    );
    await queryRunner.query(`ALTER TABLE "invoices" DROP COLUMN "concept"`);
  }
}
