import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { normalizeBarcode } from './barcode.util';
import { BarcodeResolveResponseDto } from './dto/barcode-resolve-response.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';
import {
  BarcodeExternalSource,
  OpenFoodFactsMapped,
  OpenFoodFactsService,
} from './open-food-facts.service';
import {
  normalizeProductName,
  normalizeSearchTerms,
} from './product-name.util';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    private readonly openFoodFacts: OpenFoodFactsService,
  ) {}

  /**
   * Resolve catalog row by normalized name, or create. Used for CSV / bulk import
   * when the global name must exist before attaching a shop listing.
   */
  async findOrCreateForImport(dto: CreateProductDto): Promise<Product> {
    const nameNormalized = normalizeProductName(dto.name);
    const existing = await this.findByNormalizedName(nameNormalized);
    if (existing) {
      return existing;
    }
    try {
      return await this.create(dto);
    } catch (e) {
      if (e instanceof ConflictException) {
        const again = await this.findByNormalizedName(nameNormalized);
        if (again) {
          return again;
        }
      }
      throw e;
    }
  }

  async create(dto: CreateProductDto): Promise<Product> {
    const nameNormalized = normalizeProductName(dto.name);
    const existing = await this.productsRepository.findOne({
      where: { nameNormalized, isDeleted: false },
    });
    if (existing) {
      throw new ConflictException(
        `A product with a similar name already exists: ${existing.name}`,
      );
    }

    let barcode: string | null = null;
    if (dto.barcode != null && String(dto.barcode).trim() !== '') {
      const bc = normalizeBarcode(String(dto.barcode));
      if (!bc) {
        throw new BadRequestException('Invalid barcode format');
      }
      const taken = await this.productsRepository.findOne({
        where: { barcode: bc, isDeleted: false },
      });
      if (taken) {
        throw new ConflictException(
          `Barcode already assigned to catalog product: ${taken.name}`,
        );
      }
      barcode = bc;
    }

    const baseTerms = normalizeSearchTerms(dto.searchTerms) ?? [];
    if (barcode && !baseTerms.includes(barcode)) {
      baseTerms.push(barcode);
    }

    const row = this.productsRepository.create({
      name: dto.name.trim(),
      nameNormalized,
      description: dto.description?.trim() ?? null,
      category: dto.category?.trim() ?? null,
      defaultImageUrl: dto.defaultImageUrl?.trim() ?? null,
      searchTerms: baseTerms.length > 0 ? baseTerms : null,
      barcode,
    });
    return this.productsRepository.save(row);
  }

  async findOne(id: string): Promise<Product> {
    const row = await this.productsRepository.findOne({
      where: { id, isDeleted: false },
    });
    if (!row) {
      throw new NotFoundException(`Product ${id} not found`);
    }
    return row;
  }

  async findByBarcode(barcode: string): Promise<Product | null> {
    return this.productsRepository.findOne({
      where: { barcode, isDeleted: false },
    });
  }

  /**
   * Local DB → Open Food Facts (create catalog row) → unknown.
   */
  async resolveBarcode(code: string): Promise<BarcodeResolveResponseDto> {
    const local = await this.findByBarcode(code);
    if (local) {
      return { source: 'local', barcode: code, product: local };
    }

    const hit = await this.openFoodFacts.fetchProduct(code);
    if (!hit) {
      return { source: 'unknown', barcode: code, product: null };
    }

    try {
      const product = await this.createOrMergeFromOpenFoodFacts(code, hit.data);
      return { source: hit.source, barcode: code, product };
    } catch (e) {
      const again = await this.findByBarcode(code);
      if (again) {
        return { source: hit.source, barcode: code, product: again };
      }
      throw e;
    }
  }

  private async createOrMergeFromOpenFoodFacts(
    code: string,
    off: OpenFoodFactsMapped,
  ): Promise<Product> {
    const dto: CreateProductDto = {
      name: off.name,
      description: off.description,
      category: off.category,
      defaultImageUrl: off.imageUrl,
      barcode: code,
      searchTerms: [code],
    };
    try {
      return await this.create(dto);
    } catch (e) {
      if (e instanceof ConflictException) {
        const byName = await this.findByNormalizedName(
          normalizeProductName(dto.name),
        );
        if (byName && !byName.barcode) {
          const patch: UpdateProductDto = { barcode: code };
          if (off.imageUrl) {
            patch.defaultImageUrl = off.imageUrl;
          }
          if (off.description) {
            patch.description = off.description;
          }
          if (off.category) {
            patch.category = off.category;
          }
          return await this.update(byName.id, patch);
        }
        const byBc = await this.findByBarcode(code);
        if (byBc) {
          return byBc;
        }
      }
      throw e;
    }
  }

  async findByNormalizedName(nameNormalized: string): Promise<Product | null> {
    const key = normalizeProductName(nameNormalized);
    const rows = await this.productsRepository
      .createQueryBuilder('p')
      .where('p.isDeleted = :del', { del: false })
      .andWhere(
        new Brackets((qb) => {
          qb.where('p.nameNormalized = :key', { key }).orWhere(
            `EXISTS (
              SELECT 1
              FROM unnest(COALESCE(p.searchTerms, ARRAY[]::text[])) AS st(term)
              WHERE lower(trim(st.term)) = :key
            )`,
          );
        }),
      )
      .take(2)
      .getMany();
    if (rows.length > 1) {
      throw new ConflictException(
        'More than one catalog product matches this name or alias; fix duplicate aliases.',
      );
    }
    return rows[0] ?? null;
  }

  async searchByNameSubstring(q: string, limit = 30): Promise<Product[]> {
    const term = q.trim().replace(/[%_\\]/g, '');
    if (!term) {
      return [];
    }
    const cap = Math.min(Math.max(limit, 1), 100);
    const pattern = `%${term}%`;
    return this.productsRepository
      .createQueryBuilder('p')
      .where('p.isDeleted = :del', { del: false })
      .andWhere(
        new Brackets((qb) => {
          qb.where('p.name ILIKE :pattern', { pattern }).orWhere(
            `EXISTS (
              SELECT 1
              FROM unnest(COALESCE(p.searchTerms, ARRAY[]::text[])) AS st(term)
              WHERE st.term ILIKE :pattern
            )`,
          );
        }),
      )
      .orderBy('p.name', 'ASC')
      .take(cap)
      .getMany();
  }

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    const row = await this.findOne(id);
    if (dto.name !== undefined) {
      const nameNormalized = normalizeProductName(dto.name);
      const clash = await this.productsRepository.findOne({
        where: { nameNormalized, isDeleted: false },
      });
      if (clash && clash.id !== id) {
        throw new ConflictException(
          `A product with a similar name already exists: ${clash.name}`,
        );
      }
      row.name = dto.name.trim();
      row.nameNormalized = nameNormalized;
    }
    if (dto.description !== undefined) {
      row.description =
        dto.description === null ? null : dto.description.trim();
    }
    if (dto.category !== undefined) {
      row.category = dto.category === null ? null : dto.category.trim();
    }
    if (dto.defaultImageUrl !== undefined) {
      row.defaultImageUrl =
        dto.defaultImageUrl === null ? null : dto.defaultImageUrl.trim();
    }
    if (dto.searchTerms !== undefined) {
      row.searchTerms = normalizeSearchTerms(dto.searchTerms);
    }
    if (dto.barcode !== undefined) {
      if (dto.barcode === null || String(dto.barcode).trim() === '') {
        row.barcode = null;
      } else {
        const bc = normalizeBarcode(String(dto.barcode));
        if (!bc) {
          throw new BadRequestException('Invalid barcode format');
        }
        const taken = await this.productsRepository.findOne({
          where: { barcode: bc, isDeleted: false },
        });
        if (taken && taken.id !== id) {
          throw new ConflictException(
            `Barcode already assigned to: ${taken.name}`,
          );
        }
        row.barcode = bc;
      }
    }
    return this.productsRepository.save(row);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.productsRepository.update({ id }, { isDeleted: true });
  }
}
