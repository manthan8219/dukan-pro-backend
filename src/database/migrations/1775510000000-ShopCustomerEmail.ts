import { MigrationInterface, QueryRunner } from 'typeorm';

export class ShopCustomerEmail1775510000000 implements MigrationInterface {
  name = 'ShopCustomerEmail1775510000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "shop_customers" ADD "email" character varying(320)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "shop_customers" DROP COLUMN "email"`,
    );
  }
}
