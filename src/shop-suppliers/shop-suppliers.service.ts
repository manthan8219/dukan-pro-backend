import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ShopsService } from '../shops/shops.service';
import { CreateShopSupplierDto } from './dto/create-shop-supplier.dto';
import { ListShopSuppliersQueryDto } from './dto/list-shop-suppliers-query.dto';
import { ShopSupplierResponseDto } from './dto/shop-supplier-response.dto';
import { UpdateShopSupplierDto } from './dto/update-shop-supplier.dto';
import { ShopSupplier } from './entities/shop-supplier.entity';

@Injectable()
export class ShopSuppliersService {
  constructor(
    @InjectRepository(ShopSupplier)
    private readonly repo: Repository<ShopSupplier>,
    private readonly shopsService: ShopsService,
  ) {}

  private toDto(row: ShopSupplier): ShopSupplierResponseDto {
    return {
      id: row.id,
      shopId: row.shopId,
      name: row.name,
      phone: row.phone,
      email: row.email,
      address: row.address,
      categories: Array.isArray(row.categories) ? row.categories : [],
      amountOwedMinor: row.amountOwedMinor,
      note: row.note,
      clientLocalId: row.clientLocalId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async create(
    shopId: string,
    ownerUserId: string,
    dto: CreateShopSupplierDto,
  ): Promise<ShopSupplierResponseDto> {
    await this.shopsService.findOneOwnedByUser(shopId, ownerUserId);

    const clientLocalId = dto.clientLocalId?.trim() || null;
    if (clientLocalId) {
      const existing = await this.repo.findOne({
        where: { shopId, clientLocalId, isDeleted: false },
      });
      if (existing) {
        return this.toDto(existing);
      }
    }

    const row = this.repo.create({
      shopId,
      name: dto.name.trim(),
      phone: dto.phone.trim(),
      email: dto.email?.trim() || null,
      address: dto.address?.trim() || null,
      categories: dto.categories?.length ? [...dto.categories] : [],
      amountOwedMinor: dto.amountOwedMinor ?? 0,
      note: dto.note?.trim() || null,
      clientLocalId,
      createdBy: ownerUserId,
      updatedBy: ownerUserId,
    });
    const saved = await this.repo.save(row);
    return this.toDto(saved);
  }

  async listForShop(
    shopId: string,
    ownerUserId: string,
    query: ListShopSuppliersQueryDto,
  ): Promise<ShopSupplierResponseDto[]> {
    await this.shopsService.findOneOwnedByUser(shopId, ownerUserId);
    const limit = query.limit ?? 100;
    const offset = query.offset ?? 0;

    const qb = this.repo
      .createQueryBuilder('s')
      .where('s.shopId = :shopId', { shopId })
      .andWhere('s.isDeleted = false')
      .orderBy('s.createdAt', 'DESC')
      .take(limit)
      .skip(offset);

    const q = query.q?.trim();
    if (q) {
      const like = `%${q.toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(s.name) LIKE :like OR s.phone LIKE :phoneLike)',
        { like, phoneLike: `%${q}%` },
      );
    }

    const rows = await qb.getMany();
    return rows.map((r) => this.toDto(r));
  }

  async findOneForShop(
    shopId: string,
    ownerUserId: string,
    id: string,
  ): Promise<ShopSupplierResponseDto> {
    await this.shopsService.findOneOwnedByUser(shopId, ownerUserId);
    const row = await this.repo.findOne({
      where: { id, shopId, isDeleted: false },
    });
    if (!row) {
      throw new NotFoundException(`Supplier ${id} not found`);
    }
    return this.toDto(row);
  }

  async updateForShop(
    shopId: string,
    ownerUserId: string,
    id: string,
    dto: UpdateShopSupplierDto,
  ): Promise<ShopSupplierResponseDto> {
    await this.shopsService.findOneOwnedByUser(shopId, ownerUserId);
    const row = await this.repo.findOne({
      where: { id, shopId, isDeleted: false },
    });
    if (!row) {
      throw new NotFoundException(`Supplier ${id} not found`);
    }

    if (dto.name !== undefined) {
      row.name = dto.name.trim();
    }
    if (dto.phone !== undefined) {
      row.phone = dto.phone.trim();
    }
    if (dto.email !== undefined) {
      row.email =
        dto.email === null || dto.email === '' ? null : dto.email.trim();
    }
    if (dto.address !== undefined) {
      row.address =
        dto.address === null || dto.address === ''
          ? null
          : dto.address.trim();
    }
    if (dto.categories !== undefined) {
      row.categories = [...dto.categories];
    }
    if (dto.amountOwedMinor !== undefined) {
      row.amountOwedMinor = dto.amountOwedMinor;
    }
    if (dto.note !== undefined) {
      row.note =
        dto.note === null || dto.note === '' ? null : dto.note.trim();
    }

    row.updatedBy = ownerUserId;
    const saved = await this.repo.save(row);
    return this.toDto(saved);
  }

  async removeForShop(
    shopId: string,
    ownerUserId: string,
    id: string,
  ): Promise<void> {
    await this.shopsService.findOneOwnedByUser(shopId, ownerUserId);
    const row = await this.repo.findOne({
      where: { id, shopId, isDeleted: false },
    });
    if (!row) {
      throw new NotFoundException(`Supplier ${id} not found`);
    }
    row.isDeleted = true;
    row.deletedAt = new Date();
    row.deletedBy = ownerUserId;
    await this.repo.save(row);
  }
}
