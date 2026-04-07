import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  IsInt,
} from 'class-validator';
import { ShopBillingDocumentType } from '../enums/shop-billing-document-type.enum';
import { ShopBillingPaymentStatus } from '../enums/shop-billing-payment-status.enum';

export class CreateShopBillingDocumentDto {
  @ApiProperty({ enum: ShopBillingDocumentType })
  @IsEnum(ShopBillingDocumentType)
  documentType: ShopBillingDocumentType;

  @ApiProperty({ example: 'INV-001' })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  documentNumber: string;

  @ApiPropertyOptional({
    description:
      'Seller app local id — same shop + id returns the existing row (idempotent retry)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  clientLocalId?: string | null;

  @ApiProperty({
    description: 'Full invoice/quotation JSON as built in the seller app',
  })
  @IsObject()
  snapshot: Record<string, unknown>;

  @ApiProperty({
    description: 'Grand total in minor units; must match snapshot.grandTotal (×100) within 1',
  })
  @Type(() => Number)
  @IsInt()
  grandTotalMinor: number;

  @ApiPropertyOptional({ default: 'INR' })
  @IsOptional()
  @IsString()
  @MaxLength(8)
  currency?: string;

  @ApiPropertyOptional({ example: '2026-04-07' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  issueDate?: string;

  @ApiPropertyOptional({ example: '2026-04-30' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  dueDate?: string | null;

  @ApiPropertyOptional({ enum: ShopBillingPaymentStatus })
  @IsOptional()
  @IsEnum(ShopBillingPaymentStatus)
  paymentStatus?: ShopBillingPaymentStatus | null;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  paidAmountMinor?: number;

  @ApiPropertyOptional({
    description: 'Optional PDF registered via POST /content (DOCUMENT or BILL)',
  })
  @IsOptional()
  @IsUUID()
  pdfContentId?: string | null;
}
