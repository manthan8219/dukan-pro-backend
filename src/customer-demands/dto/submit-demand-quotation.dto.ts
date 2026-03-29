import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

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
    description: 'Optional PDF or image (POST /content with kind DOCUMENT, BILL, or IMAGE)',
  })
  @IsOptional()
  @IsUUID()
  quotationDocumentContentId?: string | null;
}
