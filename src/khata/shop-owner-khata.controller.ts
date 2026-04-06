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
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CreateKhataEntryDto } from './dto/create-khata-entry.dto';
import { CreateShopCustomerDto } from './dto/create-shop-customer.dto';
import { KhataEntryResponseDto } from './dto/khata-entry-response.dto';
import { ShopCustomerResponseDto } from './dto/shop-customer-response.dto';
import { UpdateShopCustomerDto } from './dto/update-shop-customer.dto';
import { KhataService } from './khata.service';

@ApiTags('khata')
@Controller('users/:userId/shops/:shopId/khata')
export class ShopOwnerKhataController {
  constructor(private readonly khataService: KhataService) {}

  @Get('customers')
  @ApiOperation({ summary: 'List khata customers for a shop (owner only)' })
  @ApiOkResponse({ type: ShopCustomerResponseDto, isArray: true })
  @ApiForbiddenResponse({ description: 'Not the shop owner' })
  listCustomers(
    @Param('userId', ParseUUIDPipe) ownerUserId: string,
    @Param('shopId', ParseUUIDPipe) shopId: string,
  ): Promise<ShopCustomerResponseDto[]> {
    return this.khataService.listShopCustomers(ownerUserId, shopId);
  }

  @Post('customers')
  @ApiOperation({ summary: 'Add a khata customer (owner only)' })
  @ApiCreatedResponse({ type: ShopCustomerResponseDto })
  @ApiForbiddenResponse()
  createCustomer(
    @Param('userId', ParseUUIDPipe) ownerUserId: string,
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @Body() dto: CreateShopCustomerDto,
  ): Promise<ShopCustomerResponseDto> {
    return this.khataService.createShopCustomer(ownerUserId, shopId, dto);
  }

  @Get('customers/:customerId')
  @ApiOperation({ summary: 'Get one khata customer with balance (owner only)' })
  @ApiOkResponse({ type: ShopCustomerResponseDto })
  @ApiNotFoundResponse()
  @ApiForbiddenResponse()
  getCustomer(
    @Param('userId', ParseUUIDPipe) ownerUserId: string,
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @Param('customerId', ParseUUIDPipe) customerId: string,
  ): Promise<ShopCustomerResponseDto> {
    return this.khataService.getShopCustomer(ownerUserId, shopId, customerId);
  }

  @Patch('customers/:customerId')
  @ApiOperation({ summary: 'Update khata customer profile (owner only)' })
  @ApiOkResponse({ type: ShopCustomerResponseDto })
  @ApiNotFoundResponse()
  @ApiForbiddenResponse()
  updateCustomer(
    @Param('userId', ParseUUIDPipe) ownerUserId: string,
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Body() dto: UpdateShopCustomerDto,
  ): Promise<ShopCustomerResponseDto> {
    return this.khataService.updateShopCustomer(
      ownerUserId,
      shopId,
      customerId,
      dto,
    );
  }

  @Delete('customers/:customerId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Soft-delete a khata customer (owner only)' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse()
  @ApiForbiddenResponse()
  async removeCustomer(
    @Param('userId', ParseUUIDPipe) ownerUserId: string,
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @Param('customerId', ParseUUIDPipe) customerId: string,
  ): Promise<void> {
    await this.khataService.softDeleteShopCustomer(
      ownerUserId,
      shopId,
      customerId,
    );
  }

  @Get('customers/:customerId/entries')
  @ApiOperation({ summary: 'List ledger entries for a khata customer (owner only)' })
  @ApiOkResponse({ type: KhataEntryResponseDto, isArray: true })
  @ApiNotFoundResponse()
  @ApiForbiddenResponse()
  listEntries(
    @Param('userId', ParseUUIDPipe) ownerUserId: string,
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @Param('customerId', ParseUUIDPipe) customerId: string,
  ): Promise<KhataEntryResponseDto[]> {
    return this.khataService.listKhataEntries(ownerUserId, shopId, customerId);
  }

  @Post('customers/:customerId/entries')
  @ApiOperation({
    summary:
      'Add a ledger line: CREDIT increases amount owed, DEBIT records a payment (owner only)',
  })
  @ApiCreatedResponse({ type: KhataEntryResponseDto })
  @ApiNotFoundResponse()
  @ApiForbiddenResponse()
  createEntry(
    @Param('userId', ParseUUIDPipe) ownerUserId: string,
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Body() dto: CreateKhataEntryDto,
  ): Promise<KhataEntryResponseDto> {
    return this.khataService.createKhataEntry(
      ownerUserId,
      shopId,
      customerId,
      dto,
    );
  }

  @Delete('customers/:customerId/entries/:entryId')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Soft-delete a ledger entry (correction; owner only)',
  })
  @ApiNoContentResponse()
  @ApiNotFoundResponse()
  @ApiForbiddenResponse()
  async removeEntry(
    @Param('userId', ParseUUIDPipe) ownerUserId: string,
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Param('entryId', ParseUUIDPipe) entryId: string,
  ): Promise<void> {
    await this.khataService.softDeleteKhataEntry(
      ownerUserId,
      shopId,
      customerId,
      entryId,
    );
  }
}
