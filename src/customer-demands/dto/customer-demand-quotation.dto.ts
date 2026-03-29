import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QuotedLineItemResponseDto } from './quoted-line-item-response.dto';

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

  @ApiPropertyOptional({
    type: [QuotedLineItemResponseDto],
    description: 'When set, the customer can proceed to checkout with these lines.',
  })
  quotedLineItems?: QuotedLineItemResponseDto[];
}
