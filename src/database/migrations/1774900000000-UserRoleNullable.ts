import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Role is null until the user picks customer or seller. Migrates legacy PENDING rows to null.
 */
export class UserRoleNullable1774900000000 implements MigrationInterface {
  name = 'UserRoleNullable1774900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "users" SET "role" = NULL WHERE "role"::text = 'PENDING'
    `);
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "role" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "users" SET "role" = 'CUSTOMER' WHERE "role" IS NULL
    `);
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'CUSTOMER'::users_role_enum`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "role" SET NOT NULL`,
    );
  }
}
