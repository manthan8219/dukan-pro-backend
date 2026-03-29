import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProductBarcode1775320000000 implements MigrationInterface {
  name = 'ProductBarcode1775320000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "products" ADD "barcode" character varying(32)`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_products_barcode_active" ON "products" ("barcode") WHERE "barcode" IS NOT NULL AND "isDeleted" = false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_products_barcode_active"`);
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "barcode"`);
  }
}
