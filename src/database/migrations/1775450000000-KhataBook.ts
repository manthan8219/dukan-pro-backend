import { MigrationInterface, QueryRunner } from 'typeorm';

export class KhataBook1775450000000 implements MigrationInterface {
  name = 'KhataBook1775450000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."khata_entry_kind_enum" AS ENUM('CREDIT', 'DEBIT')`,
    );
    await queryRunner.query(
      `CREATE TABLE "shop_customers" (
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "createdBy" uuid,
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedBy" uuid,
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "deletedBy" uuid,
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "isDeleted" boolean NOT NULL DEFAULT false,
        "shopId" uuid NOT NULL,
        "userId" uuid,
        "displayName" character varying(200) NOT NULL,
        "phone" character varying(32),
        "notes" text,
        CONSTRAINT "PK_shop_customers" PRIMARY KEY ("id"),
        CONSTRAINT "FK_shop_customers_shop" FOREIGN KEY ("shopId") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_shop_customers_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_shop_customers_shop" ON "shop_customers" ("shopId")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_shop_customers_shop_user_active" ON "shop_customers" ("shopId", "userId") WHERE ("userId" IS NOT NULL AND "isDeleted" = false)`,
    );
    await queryRunner.query(
      `CREATE TABLE "khata_entries" (
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "createdBy" uuid,
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedBy" uuid,
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "deletedBy" uuid,
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "isDeleted" boolean NOT NULL DEFAULT false,
        "shopCustomerId" uuid NOT NULL,
        "kind" "public"."khata_entry_kind_enum" NOT NULL,
        "amountMinor" integer NOT NULL,
        "description" text,
        "referenceType" character varying(64),
        "referenceId" uuid,
        "metadata" jsonb,
        CONSTRAINT "PK_khata_entries" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_khata_entries_amount_positive" CHECK ("amountMinor" > 0),
        CONSTRAINT "FK_khata_entries_shop_customer" FOREIGN KEY ("shopCustomerId") REFERENCES "shop_customers"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_khata_entries_customer_created" ON "khata_entries" ("shopCustomerId", "createdAt")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_khata_entries_customer_created"`,
    );
    await queryRunner.query(`DROP TABLE "khata_entries"`);
    await queryRunner.query(
      `DROP INDEX "public"."UQ_shop_customers_shop_user_active"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_shop_customers_shop"`);
    await queryRunner.query(`DROP TABLE "shop_customers"`);
    await queryRunner.query(`DROP TYPE "public"."khata_entry_kind_enum"`);
  }
}
