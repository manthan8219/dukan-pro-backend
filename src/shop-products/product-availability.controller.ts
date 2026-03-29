import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ProductShopSummaryDto } from './dto/product-shop-summary.dto';
import { ShopProductsService } from './shop-products.service';

@ApiTags('products')
@Controller('products')
export class ProductAvailabilityController {
  constructor(private readonly shopProductsService: ShopProductsService) {}

  @Get(':productId/shops')
  @ApiOperation({
    summary:
      'List shops that carry this catalog product (stock / listing summary)',
  })
  @ApiOkResponse({ type: ProductShopSummaryDto, isArray: true })
  @ApiNotFoundResponse({ description: 'Catalog product not found' })
  listShops(
    @Param('productId', ParseUUIDPipe) productId: string,
  ): Promise<ProductShopSummaryDto[]> {
    return this.shopProductsService.listShopsForProduct(productId);
  }
}
