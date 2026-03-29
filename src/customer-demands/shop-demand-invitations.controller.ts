import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { DemandInvitationsService } from './demand-invitations.service';
import { RejectDemandInvitationDto } from './dto/reject-demand-invitation.dto';
import { ShopDemandInvitationViewDto } from './dto/shop-demand-invitation-view.dto';
import { SubmitDemandQuotationDto } from './dto/submit-demand-quotation.dto';

@ApiTags('customer-demands')
@Controller('shops/:shopId/demand-invitations')
export class ShopDemandInvitationsController {
  constructor(
    private readonly demandInvitationsService: DemandInvitationsService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Incoming customer demands for this shop',
    description:
      'Only LIVE demands where this shop is inside delivery radius (invitation row created at publish).',
  })
  @ApiOkResponse({ type: ShopDemandInvitationViewDto, isArray: true })
  list(
    @Param('shopId', ParseUUIDPipe) shopId: string,
  ): Promise<ShopDemandInvitationViewDto[]> {
    return this.demandInvitationsService.listForShop(shopId);
  }

  @Post(':invitationId/reject')
  @ApiOperation({ summary: 'Decline this demand' })
  @ApiOkResponse({ type: ShopDemandInvitationViewDto })
  @ApiNotFoundResponse()
  reject(
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @Param('invitationId', ParseUUIDPipe) invitationId: string,
    @Body() dto: RejectDemandInvitationDto,
  ): Promise<ShopDemandInvitationViewDto> {
    return this.demandInvitationsService.rejectInvitation(
      shopId,
      invitationId,
      dto,
    );
  }

  @Post(':invitationId/quote')
  @ApiOperation({
    summary: 'Accept with a quotation',
    description:
      'Optional bill/PDF via content id (POST /content as DOCUMENT, BILL, or IMAGE).',
  })
  @ApiOkResponse({ type: ShopDemandInvitationViewDto })
  @ApiNotFoundResponse()
  submitQuote(
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @Param('invitationId', ParseUUIDPipe) invitationId: string,
    @Body() dto: SubmitDemandQuotationDto,
  ): Promise<ShopDemandInvitationViewDto> {
    return this.demandInvitationsService.submitQuotation(
      shopId,
      invitationId,
      dto,
    );
  }
}
