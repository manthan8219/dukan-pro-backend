import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ShopBillingPaymentStatus } from '../enums/shop-billing-payment-status.enum';

export class UpdateShopBillingDocumentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  snapshot?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  grandTotalMinor?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(32)
  dueDate?: string | null;

  @ApiPropertyOptional({ enum: ShopBillingPaymentStatus })
  @IsOptional()
  @IsEnum(ShopBillingPaymentStatus)
  paymentStatus?: ShopBillingPaymentStatus | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  paidAmountMinor?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  pdfContentId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  documentNumber?: string;
}
