import { MigrationInterface, QueryRunner } from 'typeorm';

export class ShopSuppliers1775500000000 implements MigrationInterface {
  name = 'ShopSuppliers1775500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "shop_suppliers" (
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "createdBy" uuid,
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedBy" uuid,
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "deletedBy" uuid,
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "isDeleted" boolean NOT NULL DEFAULT false,
        "shopId" uuid NOT NULL,
        "name" character varying(256) NOT NULL,
        "phone" character varying(64) NOT NULL,
        "email" character varying(255),
        "address" text,
        "categories" jsonb NOT NULL DEFAULT '[]',
        "amountOwedMinor" integer NOT NULL DEFAULT 0,
        "note" text,
        "clientLocalId" character varying(128),
        CONSTRAINT "PK_shop_suppliers" PRIMARY KEY ("id"),
        CONSTRAINT "FK_shop_suppliers_shop" FOREIGN KEY ("shopId") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "UQ_shop_suppliers_shop_clientLocalId" UNIQUE ("shopId", "clientLocalId")
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_shop_suppliers_shop_created" ON "shop_suppliers" ("shopId", "createdAt")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "shop_suppliers"`);
  }
}
