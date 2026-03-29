import { MigrationInterface, QueryRunner } from 'typeorm';

export class CustomerDemandAwardedInvitation1775300000000
  implements MigrationInterface
{
  name = 'CustomerDemandAwardedInvitation1775300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "customer_demands" ADD "awardedInvitationId" uuid`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_customer_demands_awardedInvitationId" ON "customer_demands" ("awardedInvitationId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "customer_demands" ADD CONSTRAINT "FK_customer_demands_awarded_invitation" FOREIGN KEY ("awardedInvitationId") REFERENCES "demand_shop_invitations"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "customer_demands" DROP CONSTRAINT "FK_customer_demands_awarded_invitation"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_customer_demands_awardedInvitationId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "customer_demands" DROP COLUMN "awardedInvitationId"`,
    );
  }
}
