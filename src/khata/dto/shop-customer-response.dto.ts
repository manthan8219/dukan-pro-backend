import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ShopCustomerResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  shopId: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  userId: string | null;

  @ApiProperty()
  displayName: string;

  @ApiPropertyOptional({ nullable: true })
  phone: string | null;

  @ApiPropertyOptional({ nullable: true })
  notes: string | null;

  @ApiProperty({
    description:
      'Net amount the customer still owes the shop (minor units). CREDIT minus DEBIT.',
  })
  outstandingBalanceMinor: number;

  @ApiProperty({
    description: 'True when outstandingBalanceMinor > 0.',
  })
  hasOutstanding: boolean;

  @ApiProperty()
  createdAt: Date;
}
