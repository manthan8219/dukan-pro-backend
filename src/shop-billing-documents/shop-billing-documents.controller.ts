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
import { CreateShopBillingDocumentDto } from './dto/create-shop-billing-document.dto';
import { ListShopBillingDocumentsQueryDto } from './dto/list-shop-billing-documents-query.dto';
import { ShopBillingDocumentResponseDto } from './dto/shop-billing-document-response.dto';
import { UpdateShopBillingDocumentDto } from './dto/update-shop-billing-document.dto';
import { ShopBillingDocumentsService } from './shop-billing-documents.service';

@ApiTags('shop-billing-documents')
@Controller('shops/:shopId/billing-documents')
@UseGuards(FirebaseAuthGuard)
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Invalid or missing Firebase ID token' })
@ApiForbiddenResponse({ description: 'Not the shop owner' })
export class ShopBillingDocumentsController {
  constructor(private readonly service: ShopBillingDocumentsService) {}

  @Post()
  @ApiOperation({
    summary: 'Create invoice or quotation (idempotent when clientLocalId repeats)',
  })
  @ApiCreatedResponse({ type: ShopBillingDocumentResponseDto })
  @ApiNotFoundResponse({ description: 'Shop not found' })
  create(
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @CurrentUser() user: User,
    @Body() dto: CreateShopBillingDocumentDto,
  ): Promise<ShopBillingDocumentResponseDto> {
    return this.service.create(shopId, user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List invoices and quotations for this shop' })
  @ApiOkResponse({ type: ShopBillingDocumentResponseDto, isArray: true })
  list(
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @CurrentUser() user: User,
    @Query() query: ListShopBillingDocumentsQueryDto,
  ): Promise<ShopBillingDocumentResponseDto[]> {
    return this.service.listForShop(shopId, user.id, query);
  }

  @Get(':documentId')
  @ApiOperation({ summary: 'Get one billing document' })
  @ApiOkResponse({ type: ShopBillingDocumentResponseDto })
  @ApiNotFoundResponse()
  findOne(
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @CurrentUser() user: User,
  ): Promise<ShopBillingDocumentResponseDto> {
    return this.service.findOneForShop(shopId, user.id, documentId);
  }

  @Patch(':documentId')
  @ApiOperation({
    summary: 'Update payment fields, snapshot, or attach PDF content id',
  })
  @ApiOkResponse({ type: ShopBillingDocumentResponseDto })
  @ApiNotFoundResponse()
  update(
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateShopBillingDocumentDto,
  ): Promise<ShopBillingDocumentResponseDto> {
    return this.service.updateForShop(shopId, user.id, documentId, dto);
  }

  @Delete(':documentId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Soft-delete a billing document' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse()
  async remove(
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    await this.service.removeForShop(shopId, user.id, documentId);
  }
}
