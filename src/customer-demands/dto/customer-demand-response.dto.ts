import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CustomerDemandStatus } from '../enums/customer-demand-status.enum';

export class CustomerDemandResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  userId: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  details: string;

  @ApiPropertyOptional()
  budgetHint: string | null;

  @ApiPropertyOptional({ format: 'uuid' })
  receiptContentId: string | null;

  @ApiPropertyOptional({
    description: 'From linked content.storageUrl when receipt is set',
  })
  receiptImageUrl: string | null;

  @ApiPropertyOptional()
  receiptOrderTotalMinor: number | null;

  @ApiProperty({ enum: CustomerDemandStatus })
  status: CustomerDemandStatus;

  @ApiPropertyOptional()
  publishedAt: Date | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Delivery latitude used when matching shops' })
  deliveryLatitude: number | null;

  @ApiPropertyOptional()
  deliveryLongitude: number | null;

  @ApiPropertyOptional({
    description: 'Shops notified (in delivery radius) when published',
  })
  notifiedShopCount?: number;

  @ApiPropertyOptional({
    description: 'Shops that submitted a quotation',
  })
  quotationCount?: number;
}
