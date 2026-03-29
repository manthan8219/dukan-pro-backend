import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1774777276544 implements MigrationInterface {
  name = 'InitialSchema1774777276544';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(
      `CREATE TYPE "public"."contents_kind_enum" AS ENUM('IMAGE', 'DOCUMENT', 'BILL', 'OTHER')`,
    );
    await queryRunner.query(
      `CREATE TABLE "contents" ("createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "createdBy" uuid, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedBy" uuid, "deletedAt" TIMESTAMP WITH TIME ZONE, "deletedBy" uuid, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "isDeleted" boolean NOT NULL DEFAULT false, "storageUrl" character varying(2048) NOT NULL, "kind" "public"."contents_kind_enum" NOT NULL, "mimeType" character varying(128), "originalFileName" character varying(512), "byteSize" bigint, "ownerUserId" uuid, "metadata" jsonb, CONSTRAINT "PK_b7c504072e537532d7080c54fac" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a6e154f79aa9a1f5a3cc12ff2d" ON "contents" ("ownerUserId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_61c4d2faeb39438341c9b96cfa" ON "contents" ("kind") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_role_enum" AS ENUM('CUSTOMER', 'SELLER')`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "createdBy" uuid, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedBy" uuid, "deletedAt" TIMESTAMP WITH TIME ZONE, "deletedBy" uuid, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "isDeleted" boolean NOT NULL DEFAULT false, "firstName" character varying(120) NOT NULL, "lastName" character varying(120) NOT NULL, "email" character varying(255) NOT NULL, "phoneNumber" character varying(32) NOT NULL, "isVerified" boolean NOT NULL DEFAULT false, "role" "public"."users_role_enum" NOT NULL DEFAULT 'CUSTOMER', "firebaseUid" character varying(128), "sellerOnboardingComplete" boolean NOT NULL DEFAULT false, "lastLoginAt" TIMESTAMP, CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "UQ_e621f267079194e5428e19af2f3" UNIQUE ("firebaseUid"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "shops" ("createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "createdBy" uuid, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedBy" uuid, "deletedAt" TIMESTAMP WITH TIME ZONE, "deletedBy" uuid, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "isDeleted" boolean NOT NULL DEFAULT false, "userId" uuid NOT NULL, "name" character varying(200) NOT NULL, "displayName" character varying(200) NOT NULL, "billingName" character varying(255) NOT NULL, "location" jsonb NOT NULL, "offering" jsonb NOT NULL, "contact" jsonb NOT NULL, "gst" jsonb NOT NULL, "notes" text, "isActive" boolean NOT NULL DEFAULT true, "averageRating" numeric(4,2), "ratingCount" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_3c6aaa6607d287de99815e60b96" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_48152549b90b2c8817139aa375" ON "shops" ("userId") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."demand_shop_invitations_responsekind_enum" AS ENUM('PENDING', 'REJECTED', 'QUOTED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "demand_shop_invitations" ("createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "createdBy" uuid, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedBy" uuid, "deletedAt" TIMESTAMP WITH TIME ZONE, "deletedBy" uuid, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "isDeleted" boolean NOT NULL DEFAULT false, "demandId" uuid NOT NULL, "shopId" uuid NOT NULL, "responseKind" "public"."demand_shop_invitations_responsekind_enum" NOT NULL DEFAULT 'PENDING', "rejectReason" text, "quotationText" text, "quotationDocumentContentId" uuid, "respondedAt" TIMESTAMP WITH TIME ZONE, "respondedByUserId" uuid, CONSTRAINT "UQ_d713c052369248620b39835e2ef" UNIQUE ("demandId", "shopId"), CONSTRAINT "PK_c17a3d27c92a959ed2c239bc8fd" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_78f7b62635b576654a6d496ec2" ON "demand_shop_invitations" ("demandId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e3bdc700c000bd0dcb10b3f9b4" ON "demand_shop_invitations" ("shopId", "responseKind") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."customer_demands_status_enum" AS ENUM('DRAFT', 'LIVE', 'AWARDED', 'CLOSED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "customer_demands" ("createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "createdBy" uuid, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedBy" uuid, "deletedAt" TIMESTAMP WITH TIME ZONE, "deletedBy" uuid, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "isDeleted" boolean NOT NULL DEFAULT false, "userId" uuid NOT NULL, "title" character varying(200) NOT NULL, "details" text NOT NULL, "budgetHint" character varying(500), "receiptContentId" uuid, "receiptOrderTotalMinor" integer, "status" "public"."customer_demands_status_enum" NOT NULL DEFAULT 'DRAFT', "publishedAt" TIMESTAMP WITH TIME ZONE, "deliveryLatitude" double precision, "deliveryLongitude" double precision, CONSTRAINT "PK_1a7235840930ca1288cada602e3" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e852d655736f74c66a4471be07" ON "customer_demands" ("userId", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2dc870417f6a94252a64045b33" ON "customer_demands" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b1b7c7abf293e41dc3336865e8" ON "customer_demands" ("userId") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."customer_demand_audits_action_enum" AS ENUM('CREATED', 'UPDATED', 'PUBLISHED', 'STATUS_CHANGED', 'SOFT_DELETED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "customer_demand_audits" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "demandId" uuid NOT NULL, "occurredAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "actorUserId" uuid, "action" "public"."customer_demand_audits_action_enum" NOT NULL, "payload" jsonb NOT NULL, CONSTRAINT "PK_8af41fcc20af18fe9fd74022aaa" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_853488181751e2683d7cf76292" ON "customer_demand_audits" ("demandId", "occurredAt") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."user_notifications_type_enum" AS ENUM('INVITATION', 'SELLER_DEMAND_INVITATION', 'CUSTOMER_NEW_QUOTATION', 'SELLER_NEW_ORDER', 'SELLER_MONTHLY_INSIGHTS', 'CUSTOMER_ORDER_UPDATE')`,
    );
    await queryRunner.query(
      `CREATE TABLE "user_notifications" ("createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "createdBy" uuid, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedBy" uuid, "deletedAt" TIMESTAMP WITH TIME ZONE, "deletedBy" uuid, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "isDeleted" boolean NOT NULL DEFAULT false, "userId" uuid NOT NULL, "type" "public"."user_notifications_type_enum" NOT NULL, "title" character varying(200) NOT NULL, "body" text, "readAt" TIMESTAMP WITH TIME ZONE, "invitationId" uuid, "dedupeKey" character varying(220), "context" jsonb, CONSTRAINT "PK_569622b0fd6e6ab3661de985a2b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_971e878f6efe1b2c51577d8808" ON "user_notifications" ("userId", "dedupeKey") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_fcf269bf4a0924571de87038bc" ON "user_notifications" ("userId", "readAt") `,
    );
    await queryRunner.query(
      `CREATE TABLE "products" ("createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "createdBy" uuid, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedBy" uuid, "deletedAt" TIMESTAMP WITH TIME ZONE, "deletedBy" uuid, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "isDeleted" boolean NOT NULL DEFAULT false, "name" character varying(200) NOT NULL, "nameNormalized" character varying(200) NOT NULL, "description" text, "category" character varying(100), "defaultImageUrl" character varying(2048), "searchTerms" text array, CONSTRAINT "PK_0806c755e0aca124e67c0cf6d7d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_db4700eb21e5979e329d1c4a8e" ON "products" ("nameNormalized") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."seller_profiles_plan_enum" AS ENUM('FREE', 'BASIC', 'PRO', 'ENTERPRISE')`,
    );
    await queryRunner.query(
      `CREATE TABLE "seller_profiles" ("createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "createdBy" uuid, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedBy" uuid, "deletedAt" TIMESTAMP WITH TIME ZONE, "deletedBy" uuid, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "isDeleted" boolean NOT NULL DEFAULT false, "userId" uuid NOT NULL, "plan" "public"."seller_profiles_plan_enum" NOT NULL DEFAULT 'FREE', "planStartedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "planExpiresAt" TIMESTAMP WITH TIME ZONE, "isTrialing" boolean NOT NULL DEFAULT false, "trialEndsAt" TIMESTAMP WITH TIME ZONE, CONSTRAINT "REL_49de7dde25d76b120677be9aed" UNIQUE ("userId"), CONSTRAINT "PK_13845670b88adfde01026410969" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_49de7dde25d76b120677be9aed" ON "seller_profiles" ("userId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "shop_content_links" ("createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "createdBy" uuid, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedBy" uuid, "deletedAt" TIMESTAMP WITH TIME ZONE, "deletedBy" uuid, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "isDeleted" boolean NOT NULL DEFAULT false, "shopId" uuid NOT NULL, "contentId" uuid NOT NULL, "sortOrder" integer NOT NULL, CONSTRAINT "UQ_d343dceff596c44b1ee5e13a10c" UNIQUE ("shopId", "contentId"), CONSTRAINT "PK_a09c66f8a8339ee30d557e7aebf" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_480046cbb14ca66a9e30bb9e78" ON "shop_content_links" ("shopId", "sortOrder") `,
    );
    await queryRunner.query(
      `CREATE TABLE "shop_delivery_radius_rules" ("createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "createdBy" uuid, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedBy" uuid, "deletedAt" TIMESTAMP WITH TIME ZONE, "deletedBy" uuid, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "isDeleted" boolean NOT NULL DEFAULT false, "shopId" uuid NOT NULL, "minOrderAmount" numeric(14,2) NOT NULL, "maxServiceRadiusKm" double precision NOT NULL, CONSTRAINT "PK_566cf3aeca30569ad37f0c6b459" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_30c9b41e830c992665e7a44120" ON "shop_delivery_radius_rules" ("shopId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "shop_products" ("createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "createdBy" uuid, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedBy" uuid, "deletedAt" TIMESTAMP WITH TIME ZONE, "deletedBy" uuid, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "isDeleted" boolean NOT NULL DEFAULT false, "shopId" uuid NOT NULL, "productId" uuid NOT NULL, "quantity" integer NOT NULL, "imageContentId" uuid, "unit" character varying(32) NOT NULL DEFAULT 'PIECE', "priceMinor" integer NOT NULL, "minOrderQuantity" integer NOT NULL DEFAULT '1', "isListed" boolean NOT NULL DEFAULT true, "listingNotes" text, CONSTRAINT "PK_bc7b9a757fadb6a6b0e5cc4bf7e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ea91320cac7908867e288ac7a8" ON "shop_products" ("productId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_98b764d1f5411357cb5d50b8bb" ON "shop_products" ("shopId") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_51f059443ae0eb5eb6659d14f9" ON "shop_products" ("shopId", "productId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "shop_ratings" ("createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "createdBy" uuid, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedBy" uuid, "deletedAt" TIMESTAMP WITH TIME ZONE, "deletedBy" uuid, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "isDeleted" boolean NOT NULL DEFAULT false, "shopId" uuid NOT NULL, "score" smallint NOT NULL, "ratedByUserId" uuid, "comment" text, CONSTRAINT "PK_b8af8856a930e775fbb78890ea4" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c2e9f07cad9bac7382c7d0a8e4" ON "shop_ratings" ("ratedByUserId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_949d4af177d6463801c3647d11" ON "shop_ratings" ("shopId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "shops" ADD CONSTRAINT "FK_48152549b90b2c8817139aa375b" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "demand_shop_invitations" ADD CONSTRAINT "FK_78f7b62635b576654a6d496ec27" FOREIGN KEY ("demandId") REFERENCES "customer_demands"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "demand_shop_invitations" ADD CONSTRAINT "FK_c036fae5279390240bc4ea0e19f" FOREIGN KEY ("shopId") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "demand_shop_invitations" ADD CONSTRAINT "FK_fb92b6f26a78f1d0a7c2e0e1c4d" FOREIGN KEY ("quotationDocumentContentId") REFERENCES "contents"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "customer_demands" ADD CONSTRAINT "FK_b1b7c7abf293e41dc3336865e81" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "customer_demands" ADD CONSTRAINT "FK_385a5e9ddf47df8b0effab224e4" FOREIGN KEY ("receiptContentId") REFERENCES "contents"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "customer_demand_audits" ADD CONSTRAINT "FK_db2e2a4936587ad03770b8191c1" FOREIGN KEY ("demandId") REFERENCES "customer_demands"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_notifications" ADD CONSTRAINT "FK_cb22b968fe41a9f8b219327fde8" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "seller_profiles" ADD CONSTRAINT "FK_49de7dde25d76b120677be9aedd" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "shop_content_links" ADD CONSTRAINT "FK_9a773f615de3c6ea9cda6b2266c" FOREIGN KEY ("shopId") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "shop_content_links" ADD CONSTRAINT "FK_dfeff2e490985030816a642808e" FOREIGN KEY ("contentId") REFERENCES "contents"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "shop_delivery_radius_rules" ADD CONSTRAINT "FK_30c9b41e830c992665e7a44120a" FOREIGN KEY ("shopId") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "shop_products" ADD CONSTRAINT "FK_98b764d1f5411357cb5d50b8bba" FOREIGN KEY ("shopId") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "shop_products" ADD CONSTRAINT "FK_ea91320cac7908867e288ac7a81" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "shop_products" ADD CONSTRAINT "FK_d5dad01e18b5e49c7be54a4fbfa" FOREIGN KEY ("imageContentId") REFERENCES "contents"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "shop_ratings" ADD CONSTRAINT "FK_949d4af177d6463801c3647d11f" FOREIGN KEY ("shopId") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "shop_ratings" ADD CONSTRAINT "FK_c2e9f07cad9bac7382c7d0a8e47" FOREIGN KEY ("ratedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "shop_ratings" DROP CONSTRAINT "FK_c2e9f07cad9bac7382c7d0a8e47"`,
    );
    await queryRunner.query(
      `ALTER TABLE "shop_ratings" DROP CONSTRAINT "FK_949d4af177d6463801c3647d11f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "shop_products" DROP CONSTRAINT "FK_d5dad01e18b5e49c7be54a4fbfa"`,
    );
    await queryRunner.query(
      `ALTER TABLE "shop_products" DROP CONSTRAINT "FK_ea91320cac7908867e288ac7a81"`,
    );
    await queryRunner.query(
      `ALTER TABLE "shop_products" DROP CONSTRAINT "FK_98b764d1f5411357cb5d50b8bba"`,
    );
    await queryRunner.query(
      `ALTER TABLE "shop_delivery_radius_rules" DROP CONSTRAINT "FK_30c9b41e830c992665e7a44120a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "shop_content_links" DROP CONSTRAINT "FK_dfeff2e490985030816a642808e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "shop_content_links" DROP CONSTRAINT "FK_9a773f615de3c6ea9cda6b2266c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "seller_profiles" DROP CONSTRAINT "FK_49de7dde25d76b120677be9aedd"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_notifications" DROP CONSTRAINT "FK_cb22b968fe41a9f8b219327fde8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "customer_demand_audits" DROP CONSTRAINT "FK_db2e2a4936587ad03770b8191c1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "customer_demands" DROP CONSTRAINT "FK_385a5e9ddf47df8b0effab224e4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "customer_demands" DROP CONSTRAINT "FK_b1b7c7abf293e41dc3336865e81"`,
    );
    await queryRunner.query(
      `ALTER TABLE "demand_shop_invitations" DROP CONSTRAINT "FK_fb92b6f26a78f1d0a7c2e0e1c4d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "demand_shop_invitations" DROP CONSTRAINT "FK_c036fae5279390240bc4ea0e19f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "demand_shop_invitations" DROP CONSTRAINT "FK_78f7b62635b576654a6d496ec27"`,
    );
    await queryRunner.query(
      `ALTER TABLE "shops" DROP CONSTRAINT "FK_48152549b90b2c8817139aa375b"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_949d4af177d6463801c3647d11"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c2e9f07cad9bac7382c7d0a8e4"`,
    );
    await queryRunner.query(`DROP TABLE "shop_ratings"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_51f059443ae0eb5eb6659d14f9"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_98b764d1f5411357cb5d50b8bb"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ea91320cac7908867e288ac7a8"`,
    );
    await queryRunner.query(`DROP TABLE "shop_products"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_30c9b41e830c992665e7a44120"`,
    );
    await queryRunner.query(`DROP TABLE "shop_delivery_radius_rules"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_480046cbb14ca66a9e30bb9e78"`,
    );
    await queryRunner.query(`DROP TABLE "shop_content_links"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_49de7dde25d76b120677be9aed"`,
    );
    await queryRunner.query(`DROP TABLE "seller_profiles"`);
    await queryRunner.query(`DROP TYPE "public"."seller_profiles_plan_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_db4700eb21e5979e329d1c4a8e"`,
    );
    await queryRunner.query(`DROP TABLE "products"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_fcf269bf4a0924571de87038bc"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_971e878f6efe1b2c51577d8808"`,
    );
    await queryRunner.query(`DROP TABLE "user_notifications"`);
    await queryRunner.query(
      `DROP TYPE "public"."user_notifications_type_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_853488181751e2683d7cf76292"`,
    );
    await queryRunner.query(`DROP TABLE "customer_demand_audits"`);
    await queryRunner.query(
      `DROP TYPE "public"."customer_demand_audits_action_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b1b7c7abf293e41dc3336865e8"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2dc870417f6a94252a64045b33"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e852d655736f74c66a4471be07"`,
    );
    await queryRunner.query(`DROP TABLE "customer_demands"`);
    await queryRunner.query(
      `DROP TYPE "public"."customer_demands_status_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e3bdc700c000bd0dcb10b3f9b4"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_78f7b62635b576654a6d496ec2"`,
    );
    await queryRunner.query(`DROP TABLE "demand_shop_invitations"`);
    await queryRunner.query(
      `DROP TYPE "public"."demand_shop_invitations_responsekind_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_48152549b90b2c8817139aa375"`,
    );
    await queryRunner.query(`DROP TABLE "shops"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_61c4d2faeb39438341c9b96cfa"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a6e154f79aa9a1f5a3cc12ff2d"`,
    );
    await queryRunner.query(`DROP TABLE "contents"`);
    await queryRunner.query(`DROP TYPE "public"."contents_kind_enum"`);
  }
}
