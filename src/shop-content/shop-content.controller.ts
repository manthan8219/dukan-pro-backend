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
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AttachShopContentDto } from './dto/attach-shop-content.dto';
import { ReorderShopContentDto } from './dto/reorder-shop-content.dto';
import { ShopContentLink } from './entities/shop-content-link.entity';
import { ShopContentService } from './shop-content.service';

@ApiTags('shop-content')
@Controller('shops/:shopId/content-links')
export class ShopContentController {
  constructor(private readonly shopContentService: ShopContentService) {}

  @Post()
  @ApiOperation({
    summary:
      'Attach an existing content record to a shop (append or insert at sortOrder)',
  })
  @ApiCreatedResponse({ type: ShopContentLink })
  @ApiNotFoundResponse({ description: 'Shop or content not found' })
  attach(
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @Body() dto: AttachShopContentDto,
  ): Promise<ShopContentLink> {
    return this.shopContentService.attach(shopId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List shop images/docs ordered by sortOrder' })
  @ApiOkResponse({ type: ShopContentLink, isArray: true })
  @ApiNotFoundResponse({ description: 'Shop not found' })
  list(
    @Param('shopId', ParseUUIDPipe) shopId: string,
  ): Promise<ShopContentLink[]> {
    return this.shopContentService.listByShop(shopId);
  }

  @Patch('reorder')
  @ApiOperation({
    summary: 'Set display order for all active links on this shop',
  })
  @ApiOkResponse({ type: ShopContentLink, isArray: true })
  @ApiNotFoundResponse({ description: 'Shop not found' })
  reorder(
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @Body() dto: ReorderShopContentDto,
  ): Promise<ShopContentLink[]> {
    return this.shopContentService.reorder(shopId, dto);
  }

  @Delete(':linkId')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Remove link between shop and file (does not delete content row)',
  })
  @ApiNotFoundResponse()
  detach(
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @Param('linkId', ParseUUIDPipe) linkId: string,
  ): Promise<void> {
    return this.shopContentService.detach(shopId, linkId);
  }
}
