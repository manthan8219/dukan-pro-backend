import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { Repository } from 'typeorm';
import { ContentKind } from '../content/content-kind.enum';
import { ContentService } from '../content/content.service';
import { CreateProductDto } from '../products/dto/create-product.dto';
import { ProductsService } from '../products/products.service';
import { ShopsService } from '../shops/shops.service';
import { parseInventoryCsv } from './csv-inventory.parser';
import { CsvImportResultDto } from './dto/csv-import-result.dto';
import { CreateShopProductDto } from './dto/create-shop-product.dto';
import { ProductShopSummaryDto } from './dto/product-shop-summary.dto';
import { ShopProductResponseDto } from './dto/shop-product-response.dto';
import { UpdateShopProductDto } from './dto/update-shop-product.dto';
import { ShopProduct } from './entities/shop-product.entity';

function globalFallbackImageUrl(): string {
  const fromEnv = process.env.DEFAULT_PRODUCT_IMAGE_URL?.trim();
  if (fromEnv) {
    return fromEnv;
  }
  return 'https://images.unsplash.com/photo-1560167013-0ddee2a014ea?w=800&q=80';
}

@Injectable()
export class ShopProductsService {
  constructor(
    @InjectRepository(ShopProduct)
    private readonly shopProductsRepository: Repository<ShopProduct>,
    private readonly shopsService: ShopsService,
    private readonly productsService: ProductsService,
    private readonly contentService: ContentService,
  ) {}

  /**
   * UTF-8 CSV: header with name + quantity; price column or CSV_IMPORT_DEFAULT_PRICE_RUPEES.
   * Creates catalog products when missing, then creates or updates shop listings.
   */
  async importInventoryCsvFromText(
    shopId: string,
    utf8Text: string,
  ): Promise<CsvImportResultDto> {
    await this.shopsService.findOne(shopId);
    const defaultMinor = this.defaultPriceMinorFromEnv();
    const parsed = parseInventoryCsv(utf8Text, defaultMinor);
    if ('error' in parsed) {
      throw new BadRequestException(parsed.error);
    }

    const listings: ShopProductResponseDto[] = [];
    const errors: string[] = [];
    let created = 0;
    let updated = 0;

    for (const row of parsed.rows) {
      const catalogDto: CreateProductDto = {
        name: row.name,
        category: row.category,
      };
      try {
        const product =
          await this.productsService.findOrCreateForImport(catalogDto);
        const listingDto: CreateShopProductDto = {
          productId: product.id,
          quantity: row.quantity,
          priceMinor: row.priceMinor,
          unit: row.unit ?? undefined,
          listingNotes: row.listingNotes,
        };
        try {
          const res = await this.create(shopId, listingDto);
          listings.push(res);
          created += 1;
        } catch (e) {
          if (e instanceof ConflictException) {
            const patch: UpdateShopProductDto = {
              quantity: row.quantity,
              priceMinor: row.priceMinor,
              listingNotes: row.listingNotes,
            };
            if (row.unit) {
              patch.unit = row.unit;
            }
            const res = await this.update(shopId, product.id, patch);
            listings.push(res);
            updated += 1;
          } else {
            errors.push(
              `Row ${row.rowNumber} (${row.name}): ${e instanceof Error ? e.message : String(e)}`,
            );
          }
        }
      } catch (e) {
        errors.push(
          `Row ${row.rowNumber} (${row.name}): ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }

    return {
      created,
      updated,
      skippedParse: parsed.parseWarnings.length,
      parseWarnings: parsed.parseWarnings,
      errors: errors.length ? errors : undefined,
      listings: listings.length ? listings : undefined,
    };
  }

  /**
   * Read CSV from disk under CSV_IMPORT_BASE_DIR (absolute). relativePath must not escape the base.
   */
  async importInventoryCsvFromPath(
    shopId: string,
    relativePath: string,
  ): Promise<CsvImportResultDto> {
    const fullPath = this.resolveAllowedImportPath(relativePath);
    let buf: Buffer;
    try {
      buf = await fs.readFile(fullPath);
    } catch {
      throw new BadRequestException(`Could not read file: ${relativePath}`);
    }
    const text = buf.toString('utf8');
    return this.importInventoryCsvFromText(shopId, text);
  }

  async create(
    shopId: string,
    dto: CreateShopProductDto,
  ): Promise<ShopProductResponseDto> {
    await this.shopsService.findOne(shopId);
    const product = await this.productsService.findOne(dto.productId);
    if (dto.imageContentId) {
      await this.assertImageContent(dto.imageContentId);
    }

    const existing = await this.shopProductsRepository.findOne({
      where: { shopId, productId: dto.productId },
    });

    if (existing) {
      if (!existing.isDeleted) {
        throw new ConflictException(
          `Shop already lists product ${dto.productId}; update the listing instead`,
        );
      }
      existing.isDeleted = false;
      existing.quantity = dto.quantity;
      existing.imageContentId = dto.imageContentId ?? null;
      existing.unit = dto.unit?.trim() ?? 'PIECE';
      existing.priceMinor = dto.priceMinor;
      existing.minOrderQuantity = dto.minOrderQuantity ?? 1;
      existing.isListed = dto.isListed ?? true;
      existing.listingNotes = dto.listingNotes?.trim() ?? null;
      const saved = await this.shopProductsRepository.save(existing);
      return this.toResponse(await this.loadWithRelations(saved.id), product);
    }

    const row = this.shopProductsRepository.create({
      shopId,
      productId: dto.productId,
      quantity: dto.quantity,
      imageContentId: dto.imageContentId ?? null,
      unit: dto.unit?.trim() ?? 'PIECE',
      priceMinor: dto.priceMinor,
      minOrderQuantity: dto.minOrderQuantity ?? 1,
      isListed: dto.isListed ?? true,
      listingNotes: dto.listingNotes?.trim() ?? null,
    });
    const saved = await this.shopProductsRepository.save(row);
    return this.toResponse(await this.loadWithRelations(saved.id), product);
  }

  async listForShop(
    shopId: string,
    listedOnly?: boolean,
  ): Promise<ShopProductResponseDto[]> {
    await this.shopsService.findOne(shopId);
    const qb = this.shopProductsRepository
      .createQueryBuilder('sp')
      .leftJoinAndSelect('sp.product', 'product')
      .leftJoinAndSelect('sp.imageContent', 'imageContent')
      .where('sp.shopId = :shopId', { shopId })
      .andWhere('sp.isDeleted = false')
      .orderBy('sp.createdAt', 'DESC');
    if (listedOnly === true) {
      qb.andWhere('sp.isListed = true');
    }
    const rows = await qb.getMany();
    return rows.map((r) => this.toResponse(r, r.product));
  }

  async findOneForShop(
    shopId: string,
    productId: string,
  ): Promise<ShopProductResponseDto> {
    await this.shopsService.findOne(shopId);
    const row = await this.shopProductsRepository.findOne({
      where: { shopId, productId, isDeleted: false },
      relations: ['product', 'imageContent'],
    });
    if (!row) {
      throw new NotFoundException(
        `Listing for shop ${shopId} and product ${productId} not found`,
      );
    }
    return this.toResponse(row, row.product);
  }

  async update(
    shopId: string,
    productId: string,
    dto: UpdateShopProductDto,
  ): Promise<ShopProductResponseDto> {
    const row = await this.shopProductsRepository.findOne({
      where: { shopId, productId, isDeleted: false },
      relations: ['product', 'imageContent'],
    });
    if (!row) {
      throw new NotFoundException(
        `Listing for shop ${shopId} and product ${productId} not found`,
      );
    }
    if (dto.imageContentId !== undefined) {
      if (dto.imageContentId) {
        await this.assertImageContent(dto.imageContentId);
      }
      row.imageContentId = dto.imageContentId;
    }
    if (dto.quantity !== undefined) row.quantity = dto.quantity;
    if (dto.unit !== undefined) row.unit = dto.unit.trim();
    if (dto.priceMinor !== undefined) {
      row.priceMinor = dto.priceMinor;
    }
    if (dto.minOrderQuantity !== undefined) {
      row.minOrderQuantity = dto.minOrderQuantity;
    }
    if (dto.isListed !== undefined) row.isListed = dto.isListed;
    if (dto.listingNotes !== undefined) {
      row.listingNotes =
        dto.listingNotes === null ? null : dto.listingNotes.trim();
    }
    await this.shopProductsRepository.save(row);
    return this.toResponse(await this.loadWithRelations(row.id), row.product);
  }

  async listShopsForProduct(
    productId: string,
  ): Promise<ProductShopSummaryDto[]> {
    await this.productsService.findOne(productId);
    const rows = await this.shopProductsRepository.find({
      where: { productId, isDeleted: false },
      relations: ['shop'],
      order: { quantity: 'DESC' },
    });
    return rows.map((r) => ({
      shopId: r.shopId,
      shopDisplayName: r.shop.displayName,
      quantity: r.quantity,
      isListed: r.isListed,
      unit: r.unit,
      priceMinor: r.priceMinor,
    }));
  }

  async remove(shopId: string, productId: string): Promise<void> {
    const row = await this.shopProductsRepository.findOne({
      where: { shopId, productId, isDeleted: false },
    });
    if (!row) {
      throw new NotFoundException(
        `Listing for shop ${shopId} and product ${productId} not found`,
      );
    }
    await this.shopProductsRepository.update(
      { id: row.id },
      { isDeleted: true },
    );
  }

  private async loadWithRelations(id: string): Promise<ShopProduct> {
    const row = await this.shopProductsRepository.findOne({
      where: { id },
      relations: ['product', 'imageContent'],
    });
    if (!row) {
      throw new NotFoundException(`Shop product ${id} not found`);
    }
    return row;
  }

  private defaultPriceMinorFromEnv(): number | null {
    const raw = process.env.CSV_IMPORT_DEFAULT_PRICE_RUPEES?.trim();
    if (!raw) {
      return null;
    }
    const n = Number(raw.replace(/,/g, ''));
    if (!Number.isFinite(n) || n < 0.01) {
      return null;
    }
    const minor = Math.round(n * 100 + Number.EPSILON);
    if (minor < 1 || minor > 2_000_000_000) {
      return null;
    }
    return minor;
  }

  private resolveAllowedImportPath(relativePath: string): string {
    const base = process.env.CSV_IMPORT_BASE_DIR?.trim();
    if (!base) {
      throw new ServiceUnavailableException(
        'CSV_IMPORT_BASE_DIR is not configured on this server',
      );
    }
    const resolvedBase = path.resolve(base);
    const joined = path.resolve(resolvedBase, relativePath);
    const rel = path.relative(resolvedBase, joined);
    if (rel.startsWith('..') || path.isAbsolute(rel)) {
      throw new BadRequestException('Path escapes CSV_IMPORT_BASE_DIR');
    }
    return joined;
  }

  private async assertImageContent(contentId: string): Promise<void> {
    const content = await this.contentService.findOne(contentId);
    if (content.kind !== ContentKind.IMAGE) {
      throw new BadRequestException(
        `Content ${contentId} must have kind IMAGE for a product photo`,
      );
    }
  }

  private toResponse(
    row: ShopProduct,
    product: {
      name: string;
      category: string | null;
      defaultImageUrl: string | null;
    },
  ): ShopProductResponseDto {
    const fromShop = row.imageContent?.storageUrl?.trim();
    const fromCatalog = product.defaultImageUrl?.trim();
    const displayImageUrl =
      (fromShop && fromShop.length > 0 ? fromShop : null) ??
      (fromCatalog && fromCatalog.length > 0 ? fromCatalog : null) ??
      globalFallbackImageUrl();

    return {
      id: row.id,
      shopId: row.shopId,
      productId: row.productId,
      quantity: row.quantity,
      imageContentId: row.imageContentId,
      unit: row.unit,
      priceMinor: row.priceMinor,
      minOrderQuantity: row.minOrderQuantity,
      isListed: row.isListed,
      listingNotes: row.listingNotes,
      displayImageUrl,
      productName: product.name,
      productCategory: product.category,
    };
  }
}
