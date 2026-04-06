import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { ShopsService } from '../shops/shops.service';
import { UsersService } from '../users/users.service';
import { CreateKhataEntryDto } from './dto/create-khata-entry.dto';
import { CreateShopCustomerDto } from './dto/create-shop-customer.dto';
import { KhataEntryResponseDto } from './dto/khata-entry-response.dto';
import { ShopCustomerResponseDto } from './dto/shop-customer-response.dto';
import { UpdateShopCustomerDto } from './dto/update-shop-customer.dto';
import { KhataEntry } from './entities/khata-entry.entity';
import { ShopCustomer } from './entities/shop-customer.entity';
import { KhataEntryKind } from './enums/khata-entry-kind.enum';

@Injectable()
export class KhataService {
  constructor(
    @InjectRepository(ShopCustomer)
    private readonly shopCustomersRepository: Repository<ShopCustomer>,
    @InjectRepository(KhataEntry)
    private readonly khataEntriesRepository: Repository<KhataEntry>,
    private readonly shopsService: ShopsService,
    private readonly usersService: UsersService,
  ) {}

  async listShopCustomers(
    ownerUserId: string,
    shopId: string,
  ): Promise<ShopCustomerResponseDto[]> {
    await this.shopsService.findOneOwnedByUser(shopId, ownerUserId);
    const customers = await this.shopCustomersRepository.find({
      where: { shopId, isDeleted: false },
      order: { displayName: 'ASC', createdAt: 'DESC' },
    });
    const ids = customers.map((c) => c.id);
    const balances = await this.sumOutstandingByCustomerIds(ids);
    return customers.map((c) => this.toCustomerDto(c, balances.get(c.id) ?? 0));
  }

  async getShopCustomer(
    ownerUserId: string,
    shopId: string,
    customerId: string,
  ): Promise<ShopCustomerResponseDto> {
    await this.shopsService.findOneOwnedByUser(shopId, ownerUserId);
    const customer = await this.requireCustomerInShop(shopId, customerId);
    const balance = await this.sumOutstandingForCustomer(customerId);
    return this.toCustomerDto(customer, balance);
  }

  async createShopCustomer(
    ownerUserId: string,
    shopId: string,
    dto: CreateShopCustomerDto,
  ): Promise<ShopCustomerResponseDto> {
    await this.shopsService.findOneOwnedByUser(shopId, ownerUserId);
    let displayName = dto.displayName?.trim();
    let userId: string | null = dto.userId ?? null;
    if (userId) {
      const u = await this.usersService.findOne(userId);
      if (!displayName) {
        displayName = `${u.firstName} ${u.lastName}`.trim();
      }
    }
    if (!displayName) {
      throw new ConflictException(
        'displayName is required when userId is not linked',
      );
    }
    const row = this.shopCustomersRepository.create({
      shopId,
      userId,
      displayName,
      phone: dto.phone?.trim() || null,
      notes: dto.notes ?? null,
    });
    try {
      await this.shopCustomersRepository.save(row);
    } catch (e) {
      this.rethrowUniqueShopUser(e);
      throw e;
    }
    return this.toCustomerDto(row, 0);
  }

  async updateShopCustomer(
    ownerUserId: string,
    shopId: string,
    customerId: string,
    dto: UpdateShopCustomerDto,
  ): Promise<ShopCustomerResponseDto> {
    await this.shopsService.findOneOwnedByUser(shopId, ownerUserId);
    const customer = await this.requireCustomerInShop(shopId, customerId);
    if (dto.displayName !== undefined) {
      customer.displayName = dto.displayName.trim();
    }
    if (dto.phone !== undefined) {
      customer.phone = dto.phone?.trim() || null;
    }
    if (dto.notes !== undefined) {
      customer.notes = dto.notes;
    }
    await this.shopCustomersRepository.save(customer);
    const balance = await this.sumOutstandingForCustomer(customerId);
    return this.toCustomerDto(customer, balance);
  }

  async softDeleteShopCustomer(
    ownerUserId: string,
    shopId: string,
    customerId: string,
  ): Promise<void> {
    await this.shopsService.findOneOwnedByUser(shopId, ownerUserId);
    await this.requireCustomerInShop(shopId, customerId);
    await this.shopCustomersRepository.update(
      { id: customerId },
      { isDeleted: true },
    );
  }

  async listKhataEntries(
    ownerUserId: string,
    shopId: string,
    customerId: string,
  ): Promise<KhataEntryResponseDto[]> {
    await this.shopsService.findOneOwnedByUser(shopId, ownerUserId);
    await this.requireCustomerInShop(shopId, customerId);
    const entries = await this.khataEntriesRepository.find({
      where: { shopCustomerId: customerId, isDeleted: false },
      order: { createdAt: 'DESC' },
    });
    return entries.map((e) => this.toEntryDto(e));
  }

  async createKhataEntry(
    ownerUserId: string,
    shopId: string,
    customerId: string,
    dto: CreateKhataEntryDto,
  ): Promise<KhataEntryResponseDto> {
    await this.shopsService.findOneOwnedByUser(shopId, ownerUserId);
    await this.requireCustomerInShop(shopId, customerId);
    const entry = this.khataEntriesRepository.create({
      shopCustomerId: customerId,
      kind: dto.kind,
      amountMinor: dto.amountMinor,
      description: dto.description ?? null,
      referenceType: dto.referenceType ?? null,
      referenceId: dto.referenceId ?? null,
      metadata: dto.metadata ?? null,
    });
    const saved = await this.khataEntriesRepository.save(entry);
    return this.toEntryDto(saved);
  }

  async softDeleteKhataEntry(
    ownerUserId: string,
    shopId: string,
    customerId: string,
    entryId: string,
  ): Promise<void> {
    await this.shopsService.findOneOwnedByUser(shopId, ownerUserId);
    await this.requireCustomerInShop(shopId, customerId);
    const entry = await this.khataEntriesRepository.findOne({
      where: {
        id: entryId,
        shopCustomerId: customerId,
        isDeleted: false,
      },
    });
    if (!entry) {
      throw new NotFoundException('Khata entry not found');
    }
    await this.khataEntriesRepository.update({ id: entryId }, { isDeleted: true });
  }

  private async requireCustomerInShop(
    shopId: string,
    customerId: string,
  ): Promise<ShopCustomer> {
    const customer = await this.shopCustomersRepository.findOne({
      where: { id: customerId, shopId, isDeleted: false },
    });
    if (!customer) {
      throw new NotFoundException('Shop customer not found');
    }
    return customer;
  }

  private async sumOutstandingForCustomer(customerId: string): Promise<number> {
    const raw = await this.khataEntriesRepository
      .createQueryBuilder('e')
      .select(
        `COALESCE(SUM(CASE WHEN e.kind = :credit THEN e.amountMinor WHEN e.kind = :debit THEN -e.amountMinor ELSE 0 END), 0)`,
        'balance',
      )
      .where('e.shopCustomerId = :customerId', { customerId })
      .andWhere('e.isDeleted = false')
      .setParameter('credit', KhataEntryKind.CREDIT)
      .setParameter('debit', KhataEntryKind.DEBIT)
      .getRawOne<{ balance: string }>();
    return Number(raw?.balance ?? 0);
  }

  private async sumOutstandingByCustomerIds(
    customerIds: string[],
  ): Promise<Map<string, number>> {
    const map = new Map<string, number>(
      customerIds.map((id) => [id, 0]),
    );
    if (customerIds.length === 0) {
      return map;
    }
    const rows = await this.khataEntriesRepository
      .createQueryBuilder('e')
      .select('e.shopCustomerId', 'shopCustomerId')
      .addSelect(
        `COALESCE(SUM(CASE WHEN e.kind = :credit THEN e.amountMinor WHEN e.kind = :debit THEN -e.amountMinor ELSE 0 END), 0)`,
        'balance',
      )
      .where('e.shopCustomerId IN (:...ids)', { ids: customerIds })
      .andWhere('e.isDeleted = false')
      .groupBy('e.shopCustomerId')
      .setParameter('credit', KhataEntryKind.CREDIT)
      .setParameter('debit', KhataEntryKind.DEBIT)
      .getRawMany<{ shopCustomerId: string; balance: string }>();
    for (const row of rows) {
      map.set(row.shopCustomerId, Number(row.balance));
    }
    return map;
  }

  private toCustomerDto(
    c: ShopCustomer,
    outstandingBalanceMinor: number,
  ): ShopCustomerResponseDto {
    return {
      id: c.id,
      shopId: c.shopId,
      userId: c.userId,
      displayName: c.displayName,
      phone: c.phone,
      notes: c.notes,
      outstandingBalanceMinor,
      hasOutstanding: outstandingBalanceMinor > 0,
      createdAt: c.createdAt,
    };
  }

  private toEntryDto(e: KhataEntry): KhataEntryResponseDto {
    return {
      id: e.id,
      shopCustomerId: e.shopCustomerId,
      kind: e.kind,
      amountMinor: e.amountMinor,
      description: e.description,
      referenceType: e.referenceType,
      referenceId: e.referenceId,
      metadata: e.metadata,
      createdAt: e.createdAt,
    };
  }

  private rethrowUniqueShopUser(err: unknown): void {
    if (!(err instanceof QueryFailedError)) {
      return;
    }
    const pg = err.driverError as { code?: string };
    if (pg?.code === '23505') {
      throw new ConflictException(
        'This user is already a khata customer for this shop',
      );
    }
  }
}
