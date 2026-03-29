import {
  BadRequestException,
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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CreateShopProductDto } from './dto/create-shop-product.dto';
import { CsvImportResultDto } from './dto/csv-import-result.dto';
import { ImportCsvFromPathDto } from './dto/import-csv-from-path.dto';
import { ShopProductResponseDto } from './dto/shop-product-response.dto';
import { UpdateShopProductDto } from './dto/update-shop-product.dto';
import { ShopProductsService } from './shop-products.service';

@ApiTags('shop-products')
@Controller('shops/:shopId/products')
export class ShopProductsController {
  constructor(private readonly shopProductsService: ShopProductsService) {}

  @Post()
  @ApiOperation({
    summary: 'Add or re-activate a product listing for this shop',
    description:
      'Register photo via POST /content first, then pass imageContentId. ' +
      'If the same product was removed earlier, this revives that row.',
  })
  @ApiCreatedResponse({ type: ShopProductResponseDto })
  @ApiNotFoundResponse({ description: 'Shop or catalog product not found' })
  create(
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @Body() dto: CreateShopProductDto,
  ): Promise<ShopProductResponseDto> {
    return this.shopProductsService.create(shopId, dto);
  }

  @Post('import-csv/from-path')
  @ApiOperation({
    summary: 'Import inventory CSV from a path on the server',
    description:
      'Requires CSV_IMPORT_BASE_DIR. Pass a path relative to that directory. ' +
      'For browser uploads use POST .../import-csv with multipart field "file" instead.',
  })
  @ApiOkResponse({ type: CsvImportResultDto })
  @ApiNotFoundResponse({ description: 'Shop not found' })
  importCsvFromPath(
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @Body() dto: ImportCsvFromPathDto,
  ): Promise<CsvImportResultDto> {
    return this.shopProductsService.importInventoryCsvFromPath(
      shopId,
      dto.relativePath,
    );
  }

  @Post('import-csv')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 8 * 1024 * 1024 } }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary', description: 'UTF-8 .csv' },
      },
    },
  })
  @ApiOperation({
    summary: 'Import inventory CSV (multipart upload)',
    description:
      'Header row must include name + quantity columns (same aliases as seller UI). ' +
      'Include a price column (rupees: price, mrp, … or paise: price_minor) or set env CSV_IMPORT_DEFAULT_PRICE_RUPEES. ' +
      'Creates catalog products when missing, then creates or updates listings for this shop.',
  })
  @ApiOkResponse({ type: CsvImportResultDto })
  @ApiNotFoundResponse({ description: 'Shop not found' })
  importCsvUpload(
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @UploadedFile() file: { buffer: Buffer } | undefined,
  ): Promise<CsvImportResultDto> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Missing CSV file under field name "file"');
    }
    const text = file.buffer.toString('utf8');
    return this.shopProductsService.importInventoryCsvFromText(shopId, text);
  }

  @Get()
  @ApiOperation({ summary: 'List products stocked by this shop' })
  @ApiOkResponse({ type: ShopProductResponseDto, isArray: true })
  list(
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @Query('listedOnly') listedOnly?: string,
  ): Promise<ShopProductResponseDto[]> {
    const listedOnlyFilter =
      listedOnly === 'true' || listedOnly === '1' ? true : undefined;
    return this.shopProductsService.listForShop(shopId, listedOnlyFilter);
  }

  @Get(':productId')
  @ApiOperation({ summary: 'Get one shop listing by catalog product id' })
  @ApiOkResponse({ type: ShopProductResponseDto })
  @ApiNotFoundResponse()
  findOne(
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @Param('productId', ParseUUIDPipe) productId: string,
  ): Promise<ShopProductResponseDto> {
    return this.shopProductsService.findOneForShop(shopId, productId);
  }

  @Patch(':productId')
  @ApiOperation({ summary: 'Update quantity, price, photo, or visibility' })
  @ApiOkResponse({ type: ShopProductResponseDto })
  @ApiNotFoundResponse()
  update(
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() dto: UpdateShopProductDto,
  ): Promise<ShopProductResponseDto> {
    return this.shopProductsService.update(shopId, productId, dto);
  }

  @Delete(':productId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Soft-delete listing (frees slot to re-add later)' })
  @ApiNotFoundResponse()
  async remove(
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @Param('productId', ParseUUIDPipe) productId: string,
  ): Promise<void> {
    await this.shopProductsService.remove(shopId, productId);
  }
}
