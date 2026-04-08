import { MigrationInterface, QueryRunner } from 'typeorm';

export class UserFcmTokens1775490000000 implements MigrationInterface {
  name = 'UserFcmTokens1775490000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "user_fcm_tokens" (
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "createdBy" uuid,
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedBy" uuid,
        "deletedAt" TIMESTAMPTZ,
        "deletedBy" uuid,
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "isDeleted" boolean NOT NULL DEFAULT false,
        "userId" uuid NOT NULL,
        "token" character varying(512) NOT NULL,
        "platform" character varying(32),
        CONSTRAINT "PK_user_fcm_tokens" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_user_fcm_tokens_token" UNIQUE ("token"),
        CONSTRAINT "FK_user_fcm_tokens_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_user_fcm_tokens_userId" ON "user_fcm_tokens" ("userId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "user_fcm_tokens"`);
  }
}
