import { MigrationInterface, QueryRunner } from 'typeorm';

export class UserDeliveryAddresses1775000000000 implements MigrationInterface {
  name = 'UserDeliveryAddresses1775000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."user_delivery_addresses_tag_enum" AS ENUM('home', 'office', 'other')`,
    );
    await queryRunner.query(
      `CREATE TABLE "user_delivery_addresses" ("createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "createdBy" uuid, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedBy" uuid, "deletedAt" TIMESTAMP WITH TIME ZONE, "deletedBy" uuid, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "isDeleted" boolean NOT NULL DEFAULT false, "userId" uuid NOT NULL, "fullName" character varying(120) NOT NULL, "phone" character varying(32) NOT NULL, "line1" character varying(500) NOT NULL, "line2" character varying(500) NOT NULL DEFAULT '', "landmark" character varying(300) NOT NULL DEFAULT '', "city" character varying(120) NOT NULL, "pin" character varying(10) NOT NULL, "tag" "public"."user_delivery_addresses_tag_enum" NOT NULL, "label" character varying(120) NOT NULL, "isDefault" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_8f2b0c8e9a1d4f3e2b1c0d9e8f7" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_udaddr_userId" ON "user_delivery_addresses" ("userId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "user_delivery_addresses" ADD CONSTRAINT "FK_udaddr_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_delivery_addresses" DROP CONSTRAINT "FK_udaddr_user"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_udaddr_userId"`);
    await queryRunner.query(`DROP TABLE "user_delivery_addresses"`);
    await queryRunner.query(
      `DROP TYPE "public"."user_delivery_addresses_tag_enum"`,
    );
  }
}
