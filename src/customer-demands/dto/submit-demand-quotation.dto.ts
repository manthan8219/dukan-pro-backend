import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { DemandQuotationLineItemSubmitDto } from './demand-quotation-line-item.dto';

export class SubmitDemandQuotationDto {
  @ApiProperty({
    description: 'Detailed quotation / explanation for the customer',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(20_000)
  quotationText: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'Optional PDF or image (POST /content with kind DOCUMENT, BILL, or IMAGE)',
  })
  @IsOptional()
  @IsUUID()
  quotationDocumentContentId?: string | null;

  @ApiPropertyOptional({
    type: [DemandQuotationLineItemSubmitDto],
    description:
      'Listed SKUs and quantities for this quote. Required for the customer to check out from the quotation.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(80)
  @ValidateNested({ each: true })
  @Type(() => DemandQuotationLineItemSubmitDto)
  lineItems?: DemandQuotationLineItemSubmitDto[];
}
