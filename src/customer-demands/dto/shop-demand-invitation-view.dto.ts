import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CustomerDemandStatus } from '../enums/customer-demand-status.enum';
import { DemandShopInvitationResponse } from '../enums/demand-shop-invitation-response.enum';

export class ShopDemandInvitationViewDto {
  @ApiProperty({ format: 'uuid' })
  invitationId: string;

  @ApiProperty({ format: 'uuid' })
  demandId: string;

  @ApiProperty()
  demandTitle: string;

  @ApiProperty()
  demandDetails: string;

  @ApiPropertyOptional()
  demandBudgetHint: string | null;

  @ApiPropertyOptional()
  customerReceiptImageUrl: string | null;

  @ApiPropertyOptional()
  receiptOrderTotalMinor: number | null;

  @ApiProperty({ enum: CustomerDemandStatus })
  demandStatus: CustomerDemandStatus;

  @ApiProperty({ enum: DemandShopInvitationResponse })
  responseKind: DemandShopInvitationResponse;

  @ApiPropertyOptional()
  rejectReason: string | null;

  @ApiPropertyOptional()
  quotationText: string | null;

  @ApiPropertyOptional()
  quotationDocumentUrl: string | null;

  @ApiPropertyOptional()
  respondedAt: Date | null;
}
