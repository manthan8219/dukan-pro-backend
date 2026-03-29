import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * New sign-ups use PENDING until they choose customer or seller; role changes are then blocked in the API.
 */
export class AddUserRolePending1774800000000 implements MigrationInterface {
  name = 'AddUserRolePending1774800000000';

  /**
   * Postgres rejects using a newly added enum value in the same transaction as ADD VALUE
   * ("unsafe use of new value"). Running this migration without a wrapping transaction fixes that.
   */
  transaction = false;

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."users_role_enum" ADD VALUE 'PENDING'`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'PENDING'::users_role_enum`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'CUSTOMER'::users_role_enum`,
    );
    // Postgres cannot drop a single enum label safely; leave 'PENDING' on the type if present.
  }
}
