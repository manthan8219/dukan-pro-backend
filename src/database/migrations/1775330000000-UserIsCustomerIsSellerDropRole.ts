import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Replaces exclusive `role` enum with independent `isCustomer` and `isSeller` flags
 * so one account can shop and own a business.
 */
export class UserIsCustomerIsSellerDropRole1775330000000
  implements MigrationInterface
{
  name = 'UserIsCustomerIsSellerDropRole1775330000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "isCustomer" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "isSeller" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `UPDATE "users" SET "isCustomer" = true WHERE "role"::text = 'CUSTOMER'`,
    );
    await queryRunner.query(
      `UPDATE "users" SET "isSeller" = true WHERE "role"::text = 'SELLER'`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "role"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."users_role_enum"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."users_role_enum" AS ENUM('CUSTOMER', 'SELLER')`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "role" "public"."users_role_enum"`,
    );
    await queryRunner.query(`
      UPDATE "users" SET "role" = CASE
        WHEN "isSeller" AND NOT "isCustomer" THEN 'SELLER'::users_role_enum
        ELSE 'CUSTOMER'::users_role_enum
      END
    `);
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "role" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "isCustomer"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "isSeller"`,
    );
  }
}
