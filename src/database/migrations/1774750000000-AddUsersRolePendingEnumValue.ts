import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds PENDING to users_role_enum only if missing (safe if added manually).
 * Must run in a separate migration from SET DEFAULT so Postgres commits the new label first
 * when using per-migration transactions (migrationsTransactionMode: "each").
 */
export class AddUsersRolePendingEnumValue1774750000000
  implements MigrationInterface
{
  name = 'AddUsersRolePendingEnumValue1774750000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const rows = (await queryRunner.query(
      `SELECT 1 AS x FROM pg_enum e
       JOIN pg_type t ON e.enumtypid = t.oid
       WHERE t.typname = 'users_role_enum' AND e.enumlabel = 'PENDING'
       LIMIT 1`,
    )) as { x: number }[];
    if (rows.length > 0) {
      return;
    }
    await queryRunner.query(
      `ALTER TYPE "public"."users_role_enum" ADD VALUE 'PENDING'`,
    );
  }

  public async down(): Promise<void> {
    // Cannot remove a single enum label safely in Postgres.
  }
}
