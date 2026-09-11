import { MigrationInterface, QueryRunner } from "typeorm";

export class RemovePerUserCertificate1789161561443 implements MigrationInterface {
    name = 'RemovePerUserCertificate1789161561443'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "afip_credentials" DROP COLUMN "certEncrypted"`);
        await queryRunner.query(`ALTER TABLE "afip_credentials" DROP COLUMN "keyEncrypted"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "afip_credentials" ADD "keyEncrypted" text NOT NULL`);
        await queryRunner.query(`ALTER TABLE "afip_credentials" ADD "certEncrypted" text NOT NULL`);
    }

}
