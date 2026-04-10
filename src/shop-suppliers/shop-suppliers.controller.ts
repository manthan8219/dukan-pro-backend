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
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { User } from '../users/entities/user.entity';
import { CreateShopSupplierDto } from './dto/create-shop-supplier.dto';
import { ListShopSuppliersQueryDto } from './dto/list-shop-suppliers-query.dto';
import { ShopSupplierResponseDto } from './dto/shop-supplier-response.dto';
import { UpdateShopSupplierDto } from './dto/update-shop-supplier.dto';
import { ShopSuppliersService } from './shop-suppliers.service';

@ApiTags('shop-suppliers')
@Controller('shops/:shopId/suppliers')
@UseGuards(FirebaseAuthGuard)
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Invalid or missing Firebase ID token' })
@ApiForbiddenResponse({ description: 'Not the shop owner' })
export class ShopSuppliersController {
  constructor(private readonly service: ShopSuppliersService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a supplier (idempotent when clientLocalId repeats)',
  })
  @ApiCreatedResponse({ type: ShopSupplierResponseDto })
  @ApiNotFoundResponse({ description: 'Shop not found' })
  create(
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @CurrentUser() user: User,
    @Body() dto: CreateShopSupplierDto,
  ): Promise<ShopSupplierResponseDto> {
    return this.service.create(shopId, user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List suppliers for this shop' })
  @ApiOkResponse({ type: ShopSupplierResponseDto, isArray: true })
  list(
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @CurrentUser() user: User,
    @Query() query: ListShopSuppliersQueryDto,
  ): Promise<ShopSupplierResponseDto[]> {
    return this.service.listForShop(shopId, user.id, query);
  }

  @Get(':supplierId')
  @ApiOperation({ summary: 'Get one supplier' })
  @ApiOkResponse({ type: ShopSupplierResponseDto })
  @ApiNotFoundResponse()
  findOne(
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @Param('supplierId', ParseUUIDPipe) supplierId: string,
    @CurrentUser() user: User,
  ): Promise<ShopSupplierResponseDto> {
    return this.service.findOneForShop(shopId, user.id, supplierId);
  }

  @Patch(':supplierId')
  @ApiOperation({ summary: 'Update a supplier' })
  @ApiOkResponse({ type: ShopSupplierResponseDto })
  @ApiNotFoundResponse()
  update(
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @Param('supplierId', ParseUUIDPipe) supplierId: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateShopSupplierDto,
  ): Promise<ShopSupplierResponseDto> {
    return this.service.updateForShop(shopId, user.id, supplierId, dto);
  }

  @Delete(':supplierId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Soft-delete a supplier' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse()
  async remove(
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @Param('supplierId', ParseUUIDPipe) supplierId: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    await this.service.removeForShop(shopId, user.id, supplierId);
  }
}
