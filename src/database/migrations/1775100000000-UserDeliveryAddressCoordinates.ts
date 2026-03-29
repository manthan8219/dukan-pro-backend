import { MigrationInterface, QueryRunner } from 'typeorm';

export class UserDeliveryAddressCoordinates1775100000000
  implements MigrationInterface
{
  name = 'UserDeliveryAddressCoordinates1775100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_delivery_addresses" ADD "latitude" double precision`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_delivery_addresses" ADD "longitude" double precision`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_delivery_addresses" DROP COLUMN "longitude"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_delivery_addresses" DROP COLUMN "latitude"`,
    );
  }
}
