import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Removes buyer/seller capability flags from `users`; seller state is implied by shops / seller profile.
 */
export class DropUserCapabilityFlags1775400000000 implements MigrationInterface {
  name = 'DropUserCapabilityFlags1775400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "isCustomer"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "isSeller"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "sellerOnboardingComplete"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "sellerOnboardingComplete" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "isSeller" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "isCustomer" boolean NOT NULL DEFAULT false`,
    );
  }
}
