import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Seeds paid SellerOS subscription catalog rows (prices in paise, GST-inclusive totals
 * matching the seller app PLAN_CONFIG) and adds razorpay_checkout_orders for server-side
 * order audit + idempotent payment completion.
 */
export class SellerPaidPlansAndRazorpayCheckoutOrders1775471000000
  implements MigrationInterface
{
  name = 'SellerPaidPlansAndRazorpayCheckoutOrders1775471000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO "subscription_plans" (
        "id",
        "createdAt",
        "updatedAt",
        "isDeleted",
        "code",
        "name",
        "description",
        "trialDays",
        "billingPeriod",
        "priceAmountMinor",
        "currency",
        "features",
        "isActive",
        "sortOrder"
      ) VALUES (
        '10000000-0000-4000-8000-000000000002',
        now(),
        now(),
        false,
        'SELLER_PRO_MONTHLY',
        'SellerOS Pro (Monthly)',
        'Paid seller subscription — billed monthly (GST-inclusive)',
        0,
        'MONTHLY',
        58800,
        'INR',
        NULL,
        true,
        10
      ),
      (
        '10000000-0000-4000-8000-000000000003',
        now(),
        now(),
        false,
        'SELLER_PRO_YEARLY',
        'SellerOS Pro (Yearly)',
        'Paid seller subscription — billed yearly (GST-inclusive)',
        0,
        'YEARLY',
        589900,
        'INR',
        NULL,
        true,
        20
      )
      ON CONFLICT ("id") DO NOTHING`,
    );

    await queryRunner.query(
      `CREATE TABLE "razorpay_checkout_orders" (
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "createdBy" uuid,
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedBy" uuid,
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "deletedBy" uuid,
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "isDeleted" boolean NOT NULL DEFAULT false,
        "shopId" uuid NOT NULL,
        "ownerUserId" uuid NOT NULL,
        "planKey" character varying(16) NOT NULL,
        "subscriptionPlanId" uuid NOT NULL,
        "amountMinor" integer NOT NULL,
        "currency" character varying(8) NOT NULL DEFAULT 'INR',
        "razorpayOrderId" character varying(64) NOT NULL,
        "status" character varying(24) NOT NULL DEFAULT 'PENDING',
        "razorpayPaymentId" character varying(64),
        CONSTRAINT "PK_razorpay_checkout_orders" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_razorpay_checkout_orders_rzp_order" UNIQUE ("razorpayOrderId"),
        CONSTRAINT "UQ_razorpay_checkout_orders_rzp_payment" UNIQUE ("razorpayPaymentId"),
        CONSTRAINT "FK_rzp_co_shop" FOREIGN KEY ("shopId") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_rzp_co_user" FOREIGN KEY ("ownerUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_rzp_co_plan" FOREIGN KEY ("subscriptionPlanId") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
      )`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_rzp_co_shop_created" ON "razorpay_checkout_orders" ("shopId", "createdAt")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_rzp_co_shop_created"`);
    await queryRunner.query(`DROP TABLE "razorpay_checkout_orders"`);

    await queryRunner.query(
      `DELETE FROM "subscription_plans" WHERE "id" IN (
        '10000000-0000-4000-8000-000000000002',
        '10000000-0000-4000-8000-000000000003'
      )`,
    );
  }
}
