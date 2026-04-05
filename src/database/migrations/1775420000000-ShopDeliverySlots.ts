import { MigrationInterface, QueryRunner } from 'typeorm';

export class ShopDeliverySlots1775420000000 implements MigrationInterface {
  name = 'ShopDeliverySlots1775420000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "shop_delivery_slots" (
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "createdBy" uuid,
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedBy" uuid,
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "deletedBy" uuid,
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "isDeleted" boolean NOT NULL DEFAULT false,
        "shopId" uuid NOT NULL,
        "weekday" smallint NOT NULL,
        "startLocal" TIME NOT NULL,
        "endLocal" TIME NOT NULL,
        "sortOrder" integer NOT NULL DEFAULT 0,
        CONSTRAINT "PK_shop_delivery_slots" PRIMARY KEY ("id"),
        CONSTRAINT "FK_shop_delivery_slots_shop" FOREIGN KEY ("shopId") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_shop_delivery_slots_shop_weekday" ON "shop_delivery_slots" ("shopId", "weekday", "sortOrder")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_shop_delivery_slots_shop_weekday"`);
    await queryRunner.query(`DROP TABLE "shop_delivery_slots"`);
  }
}
