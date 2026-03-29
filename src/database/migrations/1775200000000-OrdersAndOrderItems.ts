import { MigrationInterface, QueryRunner } from 'typeorm';

export class OrdersAndOrderItems1775200000000 implements MigrationInterface {
  name = 'OrdersAndOrderItems1775200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."orders_status_enum" AS ENUM('PLACED', 'CONFIRMED', 'PROCESSING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."orders_paymentMethod_enum" AS ENUM('upi', 'card', 'cod', 'wallet')`,
    );
    await queryRunner.query(
      `CREATE TABLE "orders" ("createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "createdBy" uuid, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedBy" uuid, "deletedAt" TIMESTAMP WITH TIME ZONE, "deletedBy" uuid, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "isDeleted" boolean NOT NULL DEFAULT false, "userId" uuid NOT NULL, "shopId" uuid NOT NULL, "deliveryAddressId" uuid NOT NULL, "status" "public"."orders_status_enum" NOT NULL, "itemsSubtotalMinor" integer NOT NULL, "deliveryFeeMinor" integer NOT NULL, "totalMinor" integer NOT NULL, "paymentMethod" "public"."orders_paymentMethod_enum", "deliveredAt" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_orders_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_orders_userId" ON "orders" ("userId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_orders_shopId" ON "orders" ("shopId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_orders_deliveryAddressId" ON "orders" ("deliveryAddressId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD CONSTRAINT "FK_orders_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD CONSTRAINT "FK_orders_shop" FOREIGN KEY ("shopId") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD CONSTRAINT "FK_orders_deliveryAddress" FOREIGN KEY ("deliveryAddressId") REFERENCES "user_delivery_addresses"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `CREATE TABLE "order_items" ("createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "createdBy" uuid, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedBy" uuid, "deletedAt" TIMESTAMP WITH TIME ZONE, "deletedBy" uuid, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "isDeleted" boolean NOT NULL DEFAULT false, "orderId" uuid NOT NULL, "shopProductId" uuid NOT NULL, "unitPriceMinor" integer NOT NULL, "quantity" integer NOT NULL, "lineTotalMinor" integer NOT NULL, "productNameSnapshot" character varying(300) NOT NULL, CONSTRAINT "PK_order_items_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_order_items_orderId" ON "order_items" ("orderId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_order_items_shopProductId" ON "order_items" ("shopProductId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" ADD CONSTRAINT "FK_order_items_order" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" ADD CONSTRAINT "FK_order_items_shopProduct" FOREIGN KEY ("shopProductId") REFERENCES "shop_products"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "order_items" DROP CONSTRAINT "FK_order_items_shopProduct"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" DROP CONSTRAINT "FK_order_items_order"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_order_items_shopProductId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_order_items_orderId"`);
    await queryRunner.query(`DROP TABLE "order_items"`);

    await queryRunner.query(
      `ALTER TABLE "orders" DROP CONSTRAINT "FK_orders_deliveryAddress"`,
    );
    await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT "FK_orders_shop"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT "FK_orders_user"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_orders_deliveryAddressId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_orders_shopId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_orders_userId"`);
    await queryRunner.query(`DROP TABLE "orders"`);

    await queryRunner.query(`DROP TYPE "public"."orders_paymentMethod_enum"`);
    await queryRunner.query(`DROP TYPE "public"."orders_status_enum"`);
  }
}
