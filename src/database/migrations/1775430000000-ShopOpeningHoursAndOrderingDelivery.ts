import { MigrationInterface, QueryRunner } from 'typeorm';

export class ShopOpeningHoursAndOrderingDelivery1775430000000
  implements MigrationInterface
{
  name = 'ShopOpeningHoursAndOrderingDelivery1775430000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "shops" ADD "minOrderAmountMinor" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "shops" ADD "maxOrderAmountMinor" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "shops" ADD "offersFreeDelivery" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "shops" ADD "freeDeliveryMinOrderAmountMinor" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "shops" ADD "defaultDeliveryFeeMinor" integer NOT NULL DEFAULT 0`,
    );

    await queryRunner.query(
      `CREATE TABLE "shop_opening_hours" (
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
        "opensLocal" TIME NOT NULL,
        "closesLocal" TIME NOT NULL,
        "sortOrder" integer NOT NULL DEFAULT 0,
        CONSTRAINT "PK_shop_opening_hours" PRIMARY KEY ("id"),
        CONSTRAINT "FK_shop_opening_hours_shop" FOREIGN KEY ("shopId") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_shop_opening_hours_shop_weekday" ON "shop_opening_hours" ("shopId", "weekday", "sortOrder")`,
    );

    await queryRunner.query(
      `CREATE TABLE "shop_delivery_fee_rules" (
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "createdBy" uuid,
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedBy" uuid,
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "deletedBy" uuid,
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "isDeleted" boolean NOT NULL DEFAULT false,
        "shopId" uuid NOT NULL,
        "minOrderSubtotalMinor" integer NOT NULL,
        "deliveryFeeMinor" integer NOT NULL,
        CONSTRAINT "PK_shop_delivery_fee_rules" PRIMARY KEY ("id"),
        CONSTRAINT "FK_shop_delivery_fee_rules_shop" FOREIGN KEY ("shopId") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_shop_delivery_fee_rules_shop_min" ON "shop_delivery_fee_rules" ("shopId", "minOrderSubtotalMinor") WHERE "isDeleted" = false`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_shop_delivery_fee_rules_shop" ON "shop_delivery_fee_rules" ("shopId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_shop_delivery_fee_rules_shop"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_shop_delivery_fee_rules_shop_min"`,
    );
    await queryRunner.query(`DROP TABLE "shop_delivery_fee_rules"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_shop_opening_hours_shop_weekday"`,
    );
    await queryRunner.query(`DROP TABLE "shop_opening_hours"`);
    await queryRunner.query(
      `ALTER TABLE "shops" DROP COLUMN "defaultDeliveryFeeMinor"`,
    );
    await queryRunner.query(
      `ALTER TABLE "shops" DROP COLUMN "freeDeliveryMinOrderAmountMinor"`,
    );
    await queryRunner.query(
      `ALTER TABLE "shops" DROP COLUMN "offersFreeDelivery"`,
    );
    await queryRunner.query(
      `ALTER TABLE "shops" DROP COLUMN "maxOrderAmountMinor"`,
    );
    await queryRunner.query(
      `ALTER TABLE "shops" DROP COLUMN "minOrderAmountMinor"`,
    );
  }
}
