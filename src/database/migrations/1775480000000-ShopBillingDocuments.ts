import { MigrationInterface, QueryRunner } from 'typeorm';

export class ShopBillingDocuments1775480000000 implements MigrationInterface {
  name = 'ShopBillingDocuments1775480000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."shop_billing_documents_documenttype_enum" AS ENUM('INVOICE', 'QUOTATION')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."shop_billing_documents_paymentstatus_enum" AS ENUM('UNPAID', 'PARTIAL', 'PAID')`,
    );
    await queryRunner.query(
      `CREATE TABLE "shop_billing_documents" (
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "createdBy" uuid,
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedBy" uuid,
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "deletedBy" uuid,
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "isDeleted" boolean NOT NULL DEFAULT false,
        "shopId" uuid NOT NULL,
        "documentType" "public"."shop_billing_documents_documenttype_enum" NOT NULL,
        "documentNumber" character varying(64) NOT NULL,
        "clientLocalId" character varying(128),
        "grandTotalMinor" integer NOT NULL,
        "currency" character varying(8) NOT NULL DEFAULT 'INR',
        "issueDate" date NOT NULL,
        "dueDate" date,
        "paymentStatus" "public"."shop_billing_documents_paymentstatus_enum",
        "paidAmountMinor" integer NOT NULL DEFAULT 0,
        "snapshot" jsonb NOT NULL,
        "pdfContentId" uuid,
        CONSTRAINT "PK_shop_billing_documents" PRIMARY KEY ("id"),
        CONSTRAINT "FK_shop_billing_documents_shop" FOREIGN KEY ("shopId") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_shop_billing_documents_pdf" FOREIGN KEY ("pdfContentId") REFERENCES "contents"("id") ON DELETE SET NULL ON UPDATE NO ACTION,
        CONSTRAINT "UQ_shop_billing_documents_shop_clientLocalId" UNIQUE ("shopId", "clientLocalId")
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_shop_billing_documents_shop_issue" ON "shop_billing_documents" ("shopId", "issueDate")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_shop_billing_documents_shop_type" ON "shop_billing_documents" ("shopId", "documentType")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "shop_billing_documents"`);
    await queryRunner.query(
      `DROP TYPE "public"."shop_billing_documents_paymentstatus_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."shop_billing_documents_documenttype_enum"`,
    );
  }
}
