import { MigrationInterface, QueryRunner } from 'typeorm';

export class UserExpoPushToken1775520000000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`
      ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "expoPushToken" varchar(200) NULL
    `);
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query(`
      ALTER TABLE "users" DROP COLUMN IF EXISTS "expoPushToken"
    `);
  }
}
