import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Sets default role to PENDING for new rows. Runs after 1774750000000 so the enum value is committed.
 * Superseded later by UserRoleNullable (nullable role / no PENDING in app).
 */
export class AddUserRolePending1774800000000 implements MigrationInterface {
  name = 'AddUserRolePending1774800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'PENDING'::users_role_enum`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'CUSTOMER'::users_role_enum`,
    );
  }
}
