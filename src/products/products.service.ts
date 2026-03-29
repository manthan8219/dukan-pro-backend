import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';
import {
  normalizeProductName,
  normalizeSearchTerms,
} from './product-name.util';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
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
    const row = this.productsRepository.create({
      name: dto.name.trim(),
      nameNormalized,
      description: dto.description?.trim() ?? null,
      category: dto.category?.trim() ?? null,
      defaultImageUrl: dto.defaultImageUrl?.trim() ?? null,
      searchTerms: normalizeSearchTerms(dto.searchTerms),
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
    return this.productsRepository.save(row);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.productsRepository.update({ id }, { isDeleted: true });
  }
}
