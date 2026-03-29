import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CustomerDemandQuotationDto {
  @ApiProperty({ format: 'uuid' })
  invitationId: string;

  @ApiProperty({ format: 'uuid' })
  shopId: string;

  @ApiProperty({ example: 'Sharma Store' })
  shopDisplayName: string;

  @ApiProperty()
  quotationText: string;

  @ApiPropertyOptional({ description: 'Linked bill / PDF / image URL' })
  quotationDocumentUrl: string | null;

  @ApiProperty()
  respondedAt: Date;
}
