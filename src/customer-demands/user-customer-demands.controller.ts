import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CustomerDemandsService } from './customer-demands.service';
import { CustomerDemandAuditEntryDto } from './dto/customer-demand-audit-entry.dto';
import { CustomerDemandQuotationDto } from './dto/customer-demand-quotation.dto';
import { CustomerDemandResponseDto } from './dto/customer-demand-response.dto';
import { AcceptDemandQuotationDto } from './dto/accept-demand-quotation.dto';
import { CreateCustomerDemandDto } from './dto/create-customer-demand.dto';
import { PublishCustomerDemandDto } from './dto/publish-customer-demand.dto';
import { UpdateCustomerDemandDto } from './dto/update-customer-demand.dto';

@ApiTags('customer-demands')
@Controller('users/:userId/demands')
export class UserCustomerDemandsController {
  constructor(
    private readonly customerDemandsService: CustomerDemandsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a DRAFT request (customer)' })
  @ApiCreatedResponse({ type: CustomerDemandResponseDto })
  @ApiNotFoundResponse({ description: 'User not found' })
  create(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: CreateCustomerDemandDto,
  ): Promise<CustomerDemandResponseDto> {
    return this.customerDemandsService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List this user’s demands (not soft-deleted)' })
  @ApiOkResponse({ type: CustomerDemandResponseDto, isArray: true })
  list(
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<CustomerDemandResponseDto[]> {
    return this.customerDemandsService.listForUser(userId);
  }

  @Get(':demandId/quotations')
  @ApiOperation({
    summary: 'Quotations submitted by shops for this demand',
  })
  @ApiOkResponse({ type: CustomerDemandQuotationDto, isArray: true })
  @ApiNotFoundResponse()
  listQuotations(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('demandId', ParseUUIDPipe) demandId: string,
  ): Promise<CustomerDemandQuotationDto[]> {
    return this.customerDemandsService.listQuotationsForCustomer(
      userId,
      demandId,
    );
  }

  @Get(':demandId/audit-log')
  @ApiOperation({
    summary: 'Append-only audit history for one demand',
    description:
      'Each change (create, update, publish, status, delete) records before/after field snapshots in payload.',
  })
  @ApiOkResponse({ type: CustomerDemandAuditEntryDto, isArray: true })
  @ApiNotFoundResponse()
  auditLog(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('demandId', ParseUUIDPipe) demandId: string,
  ): Promise<CustomerDemandAuditEntryDto[]> {
    return this.customerDemandsService.listAuditLog(userId, demandId);
  }

  @Get(':demandId')
  @ApiOperation({ summary: 'Get one demand' })
  @ApiOkResponse({ type: CustomerDemandResponseDto })
  @ApiNotFoundResponse()
  findOne(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('demandId', ParseUUIDPipe) demandId: string,
  ): Promise<CustomerDemandResponseDto> {
    return this.customerDemandsService.findOneForUser(userId, demandId);
  }

  @Patch(':demandId')
  @ApiOperation({
    summary: 'Update a DRAFT demand',
    description: 'LIVE / AWARDED / CLOSED rows cannot be edited here.',
  })
  @ApiOkResponse({ type: CustomerDemandResponseDto })
  @ApiNotFoundResponse()
  update(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('demandId', ParseUUIDPipe) demandId: string,
    @Body() dto: UpdateCustomerDemandDto,
  ): Promise<CustomerDemandResponseDto> {
    return this.customerDemandsService.update(userId, demandId, dto);
  }

  @Post(':demandId/publish')
  @ApiOperation({
    summary: 'Publish DRAFT → LIVE',
    description:
      'Requires receipt (IMAGE), total ≥ ₹2000 (paise), and delivery coordinates (on draft or in body). Notifies shops in delivery radius (extended tiers use receipt total in ₹).',
  })
  @ApiOkResponse({ type: CustomerDemandResponseDto })
  @ApiNotFoundResponse()
  publish(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('demandId', ParseUUIDPipe) demandId: string,
    @Body() body: PublishCustomerDemandDto,
  ): Promise<CustomerDemandResponseDto> {
    return this.customerDemandsService.publish(userId, demandId, body);
  }

  @Post(':demandId/close')
  @ApiOperation({ summary: 'Close a LIVE demand (→ CLOSED)' })
  @ApiOkResponse({ type: CustomerDemandResponseDto })
  @ApiNotFoundResponse()
  close(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('demandId', ParseUUIDPipe) demandId: string,
  ): Promise<CustomerDemandResponseDto> {
    return this.customerDemandsService.close(userId, demandId);
  }

  @Post(':demandId/accept-quotation')
  @ApiOperation({
    summary: 'Accept one shop quotation (LIVE → AWARDED)',
    description:
      'Pass the invitation id from GET …/quotations. Locks the request to that shop.',
  })
  @ApiOkResponse({ type: CustomerDemandResponseDto })
  @ApiNotFoundResponse()
  acceptQuotation(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('demandId', ParseUUIDPipe) demandId: string,
    @Body() dto: AcceptDemandQuotationDto,
  ): Promise<CustomerDemandResponseDto> {
    return this.customerDemandsService.acceptQuotation(
      userId,
      demandId,
      dto.invitationId,
    );
  }

  @Delete(':demandId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Soft-delete a demand (audit entry kept)' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse()
  async remove(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('demandId', ParseUUIDPipe) demandId: string,
  ): Promise<void> {
    await this.customerDemandsService.remove(userId, demandId);
  }
}
