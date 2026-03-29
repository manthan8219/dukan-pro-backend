import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AcceptDemandQuotationDto {
  @ApiProperty({
    format: 'uuid',
    description: 'The shop invitation id for the quotation you want to accept',
  })
  @IsUUID()
  invitationId: string;
}
