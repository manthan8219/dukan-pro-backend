import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CreateProductDto } from './dto/create-product.dto';
import { SearchProductsQueryDto } from './dto/search-products-query.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';
import { ProductsService } from './products.service';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @ApiOperation({
    summary: 'Add a product to the global catalog (name must be unique)',
  })
  @ApiCreatedResponse({ type: Product })
  @ApiConflictResponse({ description: 'Normalized name already exists' })
  create(@Body() dto: CreateProductDto): Promise<Product> {
    return this.productsService.create(dto);
  }

  @Get('search')
  @ApiOperation({
    summary:
      'Search by name or searchTerms (substring, case-insensitive). Set searchTerms on the product for synonyms / local names.',
  })
  @ApiOkResponse({ type: Product, isArray: true })
  search(@Query() query: SearchProductsQueryDto): Promise<Product[]> {
    const limit = query.limit ?? 30;
    if (!query.q?.trim()) {
      return Promise.resolve([]);
    }
    return this.productsService.searchByNameSubstring(query.q, limit);
  }

  @Get('by-name/:normalizedName')
  @ApiOperation({
    summary:
      'Exact match on canonical normalized name or any normalized search term (alias)',
  })
  @ApiOkResponse({ type: Product })
  @ApiConflictResponse({
    description: 'Several products share the same alias (ambiguous lookup)',
  })
  @ApiNotFoundResponse()
  async findByNormalizedName(
    @Param('normalizedName') normalizedName: string,
  ): Promise<Product> {
    const row = await this.productsService.findByNormalizedName(normalizedName);
    if (!row) {
      throw new NotFoundException(
        `No product for normalized name "${normalizedName}"`,
      );
    }
    return row;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get catalog product by id' })
  @ApiOkResponse({ type: Product })
  @ApiNotFoundResponse()
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Product> {
    return this.productsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update catalog product metadata' })
  @ApiOkResponse({ type: Product })
  @ApiNotFoundResponse()
  @ApiConflictResponse()
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ): Promise<Product> {
    return this.productsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Soft-delete catalog product' })
  @ApiNotFoundResponse()
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.productsService.remove(id);
  }
}
