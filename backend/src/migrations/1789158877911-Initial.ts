import { MigrationInterface, QueryRunner } from "typeorm";

export class Initial1789158877911 implements MigrationInterface {
    name = 'Initial1789158877911'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
        await queryRunner.query(`CREATE TABLE "afip_credentials" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" character varying NOT NULL, "cuit" character varying NOT NULL, "certEncrypted" text NOT NULL, "keyEncrypted" text NOT NULL, "environment" character varying NOT NULL DEFAULT 'testing', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_7f5e1fdf30470fcb87e6b4bb767" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "passwordHash" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "idempotency_keys" ("key" character varying NOT NULL, "responseBody" jsonb, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_0afd83cbf08c9d12089a9bffc5e" PRIMARY KEY ("key"))`);
        await queryRunner.query(`CREATE TYPE "public"."invoices_status_enum" AS ENUM('issued', 'failed')`);
        await queryRunner.query(`CREATE TABLE "invoices" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" character varying NOT NULL, "credentialId" character varying NOT NULL, "salesPoint" integer NOT NULL, "amount" numeric(12,2) NOT NULL, "clientCuit" character varying, "cae" character varying, "caeExpiration" character varying, "voucherNumber" integer, "status" "public"."invoices_status_enum" NOT NULL DEFAULT 'failed', "errorMessage" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_668cef7c22a427fd822cc1be3ce" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "invoices"`);
        await queryRunner.query(`DROP TYPE "public"."invoices_status_enum"`);
        await queryRunner.query(`DROP TABLE "idempotency_keys"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TABLE "afip_credentials"`);
    }

}
