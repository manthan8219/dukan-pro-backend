import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { ShopBillingDocumentType } from '../enums/shop-billing-document-type.enum';

export class ListShopBillingDocumentsQueryDto {
  @ApiPropertyOptional({ enum: ShopBillingDocumentType })
  @IsOptional()
  @IsEnum(ShopBillingDocumentType)
  documentType?: ShopBillingDocumentType;

  @ApiPropertyOptional({ default: 50, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}
