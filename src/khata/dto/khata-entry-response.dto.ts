import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { KhataEntryKind } from '../enums/khata-entry-kind.enum';

export class KhataEntryResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  shopCustomerId: string;

  @ApiProperty({ enum: KhataEntryKind })
  kind: KhataEntryKind;

  @ApiProperty()
  amountMinor: number;

  @ApiPropertyOptional({ nullable: true })
  description: string | null;

  @ApiPropertyOptional({ nullable: true })
  referenceType: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  referenceId: string | null;

  @ApiPropertyOptional({
    description: 'Structured metadata when present.',
  })
  metadata: Record<string, unknown> | null;

  @ApiProperty()
  createdAt: Date;
}
