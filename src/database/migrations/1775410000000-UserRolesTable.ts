import { MigrationInterface, QueryRunner } from 'typeorm';

export class UserRolesTable1775410000000 implements MigrationInterface {
  name = 'UserRolesTable1775410000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."user_roles_role_enum" AS ENUM('SELLER', 'CUSTOMER')`,
    );
    await queryRunner.query(
      `CREATE TABLE "user_roles" ("createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "createdBy" uuid, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedBy" uuid, "deletedAt" TIMESTAMP WITH TIME ZONE, "deletedBy" uuid, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "isDeleted" boolean NOT NULL DEFAULT false, "userId" uuid NOT NULL, "role" "public"."user_roles_role_enum" NOT NULL, CONSTRAINT "PK_user_roles_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_user_roles_userId" ON "user_roles" ("userId") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_user_roles_userId_role_active" ON "user_roles" ("userId", "role") WHERE ("isDeleted" = false)`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_roles" ADD CONSTRAINT "FK_user_roles_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_roles" DROP CONSTRAINT "FK_user_roles_user"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_user_roles_userId_role_active"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_user_roles_userId"`);
    await queryRunner.query(`DROP TABLE "user_roles"`);
    await queryRunner.query(`DROP TYPE "public"."user_roles_role_enum"`);
  }
}
