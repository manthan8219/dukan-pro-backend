import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ShopBillingDocumentType } from '../enums/shop-billing-document-type.enum';
import { ShopBillingPaymentStatus } from '../enums/shop-billing-payment-status.enum';

export class ShopBillingDocumentResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  shopId: string;

  @ApiProperty({ enum: ShopBillingDocumentType })
  documentType: ShopBillingDocumentType;

  @ApiProperty()
  documentNumber: string;

  @ApiPropertyOptional()
  clientLocalId: string | null;

  @ApiProperty()
  grandTotalMinor: number;

  @ApiProperty()
  currency: string;

  @ApiProperty()
  issueDate: string;

  @ApiPropertyOptional()
  dueDate: string | null;

  @ApiPropertyOptional({ enum: ShopBillingPaymentStatus })
  paymentStatus: ShopBillingPaymentStatus | null;

  @ApiProperty()
  paidAmountMinor: number;

  @ApiProperty()
  snapshot: Record<string, unknown>;

  @ApiPropertyOptional({ format: 'uuid' })
  pdfContentId: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
