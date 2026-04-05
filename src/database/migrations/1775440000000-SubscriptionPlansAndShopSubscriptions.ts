import { MigrationInterface, QueryRunner } from 'typeorm';

export class SubscriptionPlansAndShopSubscriptions1775440000000
  implements MigrationInterface
{
  name = 'SubscriptionPlansAndShopSubscriptions1775440000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."subscription_plans_billing_period_enum" AS ENUM('MONTHLY', 'YEARLY', 'LIFETIME', 'CUSTOM')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."shop_subscriptions_status_enum" AS ENUM('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'EXPIRED', 'PAUSED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "subscription_plans" (
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "createdBy" uuid,
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedBy" uuid,
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "deletedBy" uuid,
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "isDeleted" boolean NOT NULL DEFAULT false,
        "code" character varying(64) NOT NULL,
        "name" character varying(200) NOT NULL,
        "description" text,
        "trialDays" integer NOT NULL DEFAULT 0,
        "billingPeriod" "public"."subscription_plans_billing_period_enum" NOT NULL,
        "priceAmountMinor" integer,
        "currency" character varying(3) NOT NULL DEFAULT 'INR',
        "features" jsonb,
        "isActive" boolean NOT NULL DEFAULT true,
        "sortOrder" integer NOT NULL DEFAULT 0,
        CONSTRAINT "PK_subscription_plans" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_subscription_plans_code" UNIQUE ("code")
      )`,
    );
    await queryRunner.query(
      `CREATE TABLE "shop_subscriptions" (
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "createdBy" uuid,
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedBy" uuid,
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "deletedBy" uuid,
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "isDeleted" boolean NOT NULL DEFAULT false,
        "shopId" uuid NOT NULL,
        "subscriptionPlanId" uuid NOT NULL,
        "status" "public"."shop_subscriptions_status_enum" NOT NULL,
        "trialStartedAt" TIMESTAMP WITH TIME ZONE,
        "trialEndsAt" TIMESTAMP WITH TIME ZONE,
        "currentPeriodStart" TIMESTAMP WITH TIME ZONE,
        "currentPeriodEnd" TIMESTAMP WITH TIME ZONE,
        "promotionalCouponCode" character varying(64),
        "promotionAppliedAt" TIMESTAMP WITH TIME ZONE,
        "promotionalDiscountPercent" numeric(5,2),
        "promotionMetadata" jsonb,
        "externalBillingSubscriptionId" character varying(255),
        "canceledAt" TIMESTAMP WITH TIME ZONE,
        "notes" text,
        CONSTRAINT "PK_shop_subscriptions" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_shop_subscriptions_shop" UNIQUE ("shopId"),
        CONSTRAINT "FK_shop_subscriptions_shop" FOREIGN KEY ("shopId") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_shop_subscriptions_plan" FOREIGN KEY ("subscriptionPlanId") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_shop_subscriptions_plan" ON "shop_subscriptions" ("subscriptionPlanId")`,
    );

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
        '10000000-0000-4000-8000-000000000001',
        now(),
        now(),
        false,
        'FREE',
        'Free',
        'Default no-cost plan for new shops',
        0,
        'LIFETIME',
        0,
        'INR',
        NULL,
        true,
        0
      )`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_shop_subscriptions_plan"`);
    await queryRunner.query(`DROP TABLE "shop_subscriptions"`);
    await queryRunner.query(`DROP TABLE "subscription_plans"`);
    await queryRunner.query(
      `DROP TYPE "public"."shop_subscriptions_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."subscription_plans_billing_period_enum"`,
    );
  }
}
