import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Introduces khata_books (root ledger per shop customer with denormalized balanceMinor)
 * and points khata_entries at khataBookId instead of shopCustomerId.
 */
export class KhataBooksLedger1775460000000 implements MigrationInterface {
  name = 'KhataBooksLedger1775460000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "khata_books" (
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "createdBy" uuid,
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedBy" uuid,
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "deletedBy" uuid,
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "isDeleted" boolean NOT NULL DEFAULT false,
        "shopId" uuid NOT NULL,
        "shopCustomerId" uuid NOT NULL,
        "userId" uuid,
        "balanceMinor" integer NOT NULL DEFAULT 0,
        CONSTRAINT "PK_khata_books" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_khata_books_shop_customer" UNIQUE ("shopCustomerId"),
        CONSTRAINT "FK_khata_books_shop" FOREIGN KEY ("shopId") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_khata_books_shop_customer" FOREIGN KEY ("shopCustomerId") REFERENCES "shop_customers"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_khata_books_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_khata_books_shop" ON "khata_books" ("shopId")`,
    );

    await queryRunner.query(
      `INSERT INTO "khata_books" (
        "createdAt", "updatedAt", "isDeleted",
        "shopId", "shopCustomerId", "userId", "balanceMinor"
      )
      SELECT sc."createdAt", sc."updatedAt", sc."isDeleted",
             sc."shopId", sc."id", sc."userId", 0
      FROM "shop_customers" sc`,
    );

    await queryRunner.query(
      `UPDATE "khata_books" kb
       SET "balanceMinor" = COALESCE(agg.bal, 0)
       FROM (
         SELECT e."shopCustomerId" AS scid,
           COALESCE(SUM(
             CASE
               WHEN e.kind = 'CREDIT' THEN e."amountMinor"
               WHEN e.kind = 'DEBIT' THEN -e."amountMinor"
               ELSE 0
             END
           ), 0)::integer AS bal
         FROM "khata_entries" e
         WHERE e."isDeleted" = false
         GROUP BY e."shopCustomerId"
       ) agg
       WHERE kb."shopCustomerId" = agg.scid`,
    );

    await queryRunner.query(
      `ALTER TABLE "khata_entries" ADD "khataBookId" uuid`,
    );
    await queryRunner.query(
      `UPDATE "khata_entries" e
       SET "khataBookId" = kb."id"
       FROM "khata_books" kb
       WHERE kb."shopCustomerId" = e."shopCustomerId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "khata_entries" ALTER COLUMN "khataBookId" SET NOT NULL`,
    );

    // Drop old index before removing shopCustomerId (Postgres may drop it with the column;
    // some DBs never had this exact name — IF EXISTS keeps migration idempotent).
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_khata_entries_customer_created"`,
    );

    await queryRunner.query(
      `ALTER TABLE "khata_entries" DROP CONSTRAINT IF EXISTS "FK_khata_entries_shop_customer"`,
    );
    await queryRunner.query(
      `ALTER TABLE "khata_entries" DROP COLUMN "shopCustomerId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "khata_entries" ADD CONSTRAINT "FK_khata_entries_khata_book" FOREIGN KEY ("khataBookId") REFERENCES "khata_books"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_khata_entries_book_created" ON "khata_entries" ("khataBookId", "createdAt")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_khata_entries_book_created"`,
    );
    await queryRunner.query(
      `ALTER TABLE "khata_entries" DROP CONSTRAINT "FK_khata_entries_khata_book"`,
    );
    await queryRunner.query(
      `ALTER TABLE "khata_entries" ADD "shopCustomerId" uuid`,
    );
    await queryRunner.query(
      `UPDATE "khata_entries" e
       SET "shopCustomerId" = kb."shopCustomerId"
       FROM "khata_books" kb
       WHERE kb."id" = e."khataBookId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "khata_entries" ALTER COLUMN "shopCustomerId" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "khata_entries" DROP COLUMN "khataBookId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "khata_entries" ADD CONSTRAINT "FK_khata_entries_shop_customer" FOREIGN KEY ("shopCustomerId") REFERENCES "shop_customers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_khata_entries_customer_created" ON "khata_entries" ("shopCustomerId", "createdAt")`,
    );

    await queryRunner.query(`DROP INDEX "public"."IDX_khata_books_shop"`);
    await queryRunner.query(`DROP TABLE "khata_books"`);
  }
}
