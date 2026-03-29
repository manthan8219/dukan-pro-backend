import { MigrationInterface, QueryRunner } from 'typeorm';

export class DemandQuotationLineItemsAndOrderSource1775310000000
  implements MigrationInterface
{
  name = 'DemandQuotationLineItemsAndOrderSource1775310000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "demand_shop_invitations" ADD "quotedLineItems" jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD "sourceDemandInvitationId" uuid`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_orders_sourceDemandInvitationId" ON "orders" ("sourceDemandInvitationId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD CONSTRAINT "FK_orders_source_demand_invitation" FOREIGN KEY ("sourceDemandInvitationId") REFERENCES "demand_shop_invitations"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "orders" DROP CONSTRAINT "FK_orders_source_demand_invitation"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_orders_sourceDemandInvitationId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" DROP COLUMN "sourceDemandInvitationId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "demand_shop_invitations" DROP COLUMN "quotedLineItems"`,
    );
  }
}
