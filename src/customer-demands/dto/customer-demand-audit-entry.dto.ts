import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CustomerDemandAuditAction } from '../enums/customer-demand-audit-action.enum';

export class CustomerDemandAuditEntryDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  demandId: string;

  @ApiProperty()
  occurredAt: Date;

  @ApiPropertyOptional({ format: 'uuid' })
  actorUserId: string | null;

  @ApiProperty({ enum: CustomerDemandAuditAction })
  action: CustomerDemandAuditAction;

  @ApiProperty({ type: 'object', additionalProperties: true })
  payload: Record<string, unknown>;
}
