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
import { CreateUserDeliveryAddressDto } from './dto/create-user-delivery-address.dto';
import { UpdateUserDeliveryAddressDto } from './dto/update-user-delivery-address.dto';
import { UserDeliveryAddressResponseDto } from './dto/user-delivery-address-response.dto';
import { UserDeliveryAddressesService } from './user-delivery-addresses.service';

@ApiTags('user-delivery-addresses')
@Controller('users/:userId/delivery-addresses')
export class UserDeliveryAddressesController {
  constructor(private readonly addressesService: UserDeliveryAddressesService) {}

  @Get()
  @ApiOperation({ summary: 'List delivery addresses for a user' })
  @ApiOkResponse({ type: UserDeliveryAddressResponseDto, isArray: true })
  @ApiNotFoundResponse({ description: 'User not found' })
  list(
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<UserDeliveryAddressResponseDto[]> {
    return this.addressesService.list(userId);
  }

  @Post()
  @ApiOperation({ summary: 'Add a delivery address' })
  @ApiCreatedResponse({ type: UserDeliveryAddressResponseDto })
  @ApiNotFoundResponse({ description: 'User not found' })
  create(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: CreateUserDeliveryAddressDto,
  ): Promise<UserDeliveryAddressResponseDto> {
    return this.addressesService.create(userId, dto);
  }

  @Patch(':addressId')
  @ApiOperation({ summary: 'Update a delivery address (setAsDefault: true selects it)' })
  @ApiOkResponse({ type: UserDeliveryAddressResponseDto })
  @ApiNotFoundResponse()
  update(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('addressId', ParseUUIDPipe) addressId: string,
    @Body() dto: UpdateUserDeliveryAddressDto,
  ): Promise<UserDeliveryAddressResponseDto> {
    return this.addressesService.update(userId, addressId, dto);
  }

  @Delete(':addressId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Soft-delete a delivery address' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse()
  async remove(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('addressId', ParseUUIDPipe) addressId: string,
  ): Promise<void> {
    await this.addressesService.remove(userId, addressId);
  }
}
