import {
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Brackets, QueryFailedError, Repository } from 'typeorm';
import { ShopsService } from '../shops/shops.service';
import { UsersService } from '../users/users.service';
import { CreateKhataEntryDto } from './dto/create-khata-entry.dto';
import { CreateShopCustomerDto } from './dto/create-shop-customer.dto';
import { KhataEntryResponseDto } from './dto/khata-entry-response.dto';
import { ShopCustomerResponseDto } from './dto/shop-customer-response.dto';
import { UpdateShopCustomerDto } from './dto/update-shop-customer.dto';
import { KhataBook } from './entities/khata-book.entity';
import { KhataEntry } from './entities/khata-entry.entity';
import { ShopCustomer } from './entities/shop-customer.entity';
import { KhataEntryKind } from './enums/khata-entry-kind.enum';

@Injectable()
export class KhataService {
  private readonly logger = new Logger(KhataService.name);

  constructor(
    @InjectRepository(ShopCustomer)
    private readonly shopCustomersRepository: Repository<ShopCustomer>,
    @InjectRepository(KhataBook)
    private readonly khataBooksRepository: Repository<KhataBook>,
    @InjectRepository(KhataEntry)
    private readonly khataEntriesRepository: Repository<KhataEntry>,
    private readonly dataSource: DataSource,
    private readonly shopsService: ShopsService,
    private readonly usersService: UsersService,
  ) {}

  async listShopCustomers(
    ownerUserId: string,
    shopId: string,
    search?: string,
  ): Promise<ShopCustomerResponseDto[]> {
    try {
      await this.shopsService.findOneOwnedByUser(shopId, ownerUserId);
      await this.ensureKhataBooksForShop(shopId);
      const raw = search?.trim() ?? '';
      const safeForLike = raw.replace(/[%_\\]/g, '').trim().slice(0, 120);

      let customers: ShopCustomer[];
      if (!safeForLike) {
        customers = await this.shopCustomersRepository.find({
          where: { shopId, isDeleted: false },
          order: { displayName: 'ASC', createdAt: 'DESC' },
        });
      } else {
        const like = `%${safeForLike}%`;
        const digitsOnly = raw.replace(/\D/g, '');
        const qb = this.shopCustomersRepository
          .createQueryBuilder('c')
          .where('c.shopId = :shopId', { shopId })
          .andWhere('c.isDeleted = false')
          .andWhere(
            new Brackets((wb) => {
              wb.where('c.displayName ILIKE :like', { like }).orWhere(
                'c.phone ILIKE :like',
                { like },
              );
              if (digitsOnly.length >= 2) {
                wb.orWhere(
                  "regexp_replace(COALESCE(c.phone, ''), '[^0-9]', '', 'g') LIKE :digitsLike",
                  { digitsLike: `%${digitsOnly}%` },
                );
              }
            }),
          )
          .orderBy('c.displayName', 'ASC')
          .addOrderBy('c.createdAt', 'DESC');
        customers = await qb.getMany();
      }

      const ids = customers.map((c) => c.id);
      const balances = await this.balancesByShopCustomerIds(ids);
      return customers.map((c) => this.toCustomerDto(c, balances.get(c.id) ?? 0));
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }
      const message = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? err.stack : undefined;
      this.logger.error(`listShopCustomers failed: ${message}`, stack);
      throw new InternalServerErrorException(
        'Could not load khata customers. Check server logs.',
      );
    }
  }

  async getShopCustomer(
    ownerUserId: string,
    shopId: string,
    customerId: string,
  ): Promise<ShopCustomerResponseDto> {
    await this.shopsService.findOneOwnedByUser(shopId, ownerUserId);
    await this.ensureKhataBooksForShop(shopId);
    const customer = await this.requireCustomerInShop(shopId, customerId);
    const balance = await this.balanceForShopCustomer(customerId);
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
    const book = this.khataBooksRepository.create({
      shopId,
      shopCustomer: { id: row.id } as ShopCustomer,
      userId: row.userId,
      balanceMinor: 0,
    });
    await this.khataBooksRepository.save(book);
    return this.toCustomerDto(row, 0);
  }

  async updateShopCustomer(
    ownerUserId: string,
    shopId: string,
    customerId: string,
    dto: UpdateShopCustomerDto,
  ): Promise<ShopCustomerResponseDto> {
    await this.shopsService.findOneOwnedByUser(shopId, ownerUserId);
    await this.ensureKhataBooksForShop(shopId);
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
    await this.khataBooksRepository
      .createQueryBuilder()
      .update(KhataBook)
      .set({ userId: customer.userId })
      .where('"shopCustomerId" = :id', { id: customerId })
      .execute();
    const balance = await this.balanceForShopCustomer(customerId);
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
    await this.khataBooksRepository
      .createQueryBuilder()
      .update(KhataBook)
      .set({ isDeleted: true })
      .where('"shopCustomerId" = :id', { id: customerId })
      .execute();
  }

  async listKhataEntries(
    ownerUserId: string,
    shopId: string,
    customerId: string,
  ): Promise<KhataEntryResponseDto[]> {
    await this.shopsService.findOneOwnedByUser(shopId, ownerUserId);
    await this.ensureKhataBooksForShop(shopId);
    await this.requireCustomerInShop(shopId, customerId);
    const book = await this.requireKhataBook(shopId, customerId);
    const entries = await this.khataEntriesRepository.find({
      where: { khataBook: { id: book.id }, isDeleted: false },
      order: { createdAt: 'DESC' },
      relations: ['khataBook', 'khataBook.shopCustomer'],
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
    await this.ensureKhataBooksForShop(shopId);
    await this.requireCustomerInShop(shopId, customerId);
    const delta =
      dto.kind === KhataEntryKind.CREDIT
        ? dto.amountMinor
        : -dto.amountMinor;

    return this.dataSource.transaction(async (manager) => {
      const book = await manager
        .createQueryBuilder(KhataBook, 'b')
        .setLock('pessimistic_write')
        .innerJoin('b.shopCustomer', 'sc')
        .where('sc.id = :cid', { cid: customerId })
        .andWhere('b.shopId = :sid', { sid: shopId })
        .andWhere('b.isDeleted = false')
        .getOne();
      if (!book) {
        throw new NotFoundException('Khata book not found for this customer');
      }
      await manager.increment(KhataBook, { id: book.id }, 'balanceMinor', delta);
      const entry = manager.create(KhataEntry, {
        khataBook: { id: book.id } as KhataBook,
        kind: dto.kind,
        amountMinor: dto.amountMinor,
        description: dto.description ?? null,
        referenceType: dto.referenceType ?? null,
        referenceId: dto.referenceId ?? null,
        metadata: dto.metadata ?? null,
      });
      const saved = await manager.save(entry);
      const withBook = await manager.findOne(KhataEntry, {
        where: { id: saved.id },
        relations: ['khataBook', 'khataBook.shopCustomer'],
      });
      return this.toEntryDto(withBook!);
    });
  }

  async softDeleteKhataEntry(
    ownerUserId: string,
    shopId: string,
    customerId: string,
    entryId: string,
  ): Promise<void> {
    await this.shopsService.findOneOwnedByUser(shopId, ownerUserId);
    await this.ensureKhataBooksForShop(shopId);
    await this.requireCustomerInShop(shopId, customerId);
    const book = await this.requireKhataBook(shopId, customerId);

    await this.dataSource.transaction(async (manager) => {
      const entry = await manager.findOne(KhataEntry, {
        where: {
          id: entryId,
          khataBook: { id: book.id },
          isDeleted: false,
        },
      });
      if (!entry) {
        throw new NotFoundException('Khata entry not found');
      }
      const reverse =
        entry.kind === KhataEntryKind.CREDIT
          ? -entry.amountMinor
          : entry.amountMinor;
      await manager.increment(KhataBook, { id: book.id }, 'balanceMinor', reverse);
      await manager.update(KhataEntry, { id: entryId }, { isDeleted: true });
    });
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

  private async requireKhataBook(
    shopId: string,
    shopCustomerId: string,
  ): Promise<KhataBook> {
    const book = await this.khataBooksRepository
      .createQueryBuilder('b')
      .innerJoin('b.shopCustomer', 'sc')
      .where('b.shopId = :sid', { sid: shopId })
      .andWhere('sc.id = :cid', { cid: shopCustomerId })
      .andWhere('b.isDeleted = false')
      .getOne();
    if (!book) {
      throw new NotFoundException('Khata book not found');
    }
    return book;
  }

  /**
   * Creates missing khata_books rows for active shop_customers (e.g. after a partial migration).
   */
  private async ensureKhataBooksForShop(shopId: string): Promise<void> {
    try {
      await this.dataSource.query(
        `INSERT INTO "khata_books" (
          "createdAt", "updatedAt", "isDeleted",
          "shopId", "shopCustomerId", "userId", "balanceMinor"
        )
        SELECT sc."createdAt", sc."updatedAt", sc."isDeleted",
               sc."shopId", sc."id", sc."userId", 0
        FROM "shop_customers" sc
        WHERE sc."shopId" = $1
          AND sc."isDeleted" = false
          AND NOT EXISTS (
            SELECT 1 FROM "khata_books" kb
            WHERE kb."shopCustomerId" = sc."id"
          )`,
        [shopId],
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`ensureKhataBooksForShop: ${msg}`);
    }
  }

  private async balanceForShopCustomer(shopCustomerId: string): Promise<number> {
    const row = await this.khataBooksRepository
      .createQueryBuilder('b')
      .select('b.balanceMinor', 'balanceMinor')
      .innerJoin('b.shopCustomer', 'sc')
      .where('sc.id = :cid', { cid: shopCustomerId })
      .andWhere('b.isDeleted = false')
      .getRawOne<{ balanceMinor: string }>();
    return Number(row?.balanceMinor ?? 0);
  }

  private async balancesByShopCustomerIds(
    customerIds: string[],
  ): Promise<Map<string, number>> {
    const map = new Map<string, number>(customerIds.map((id) => [id, 0]));
    if (customerIds.length === 0) {
      return map;
    }
    const rows = await this.khataBooksRepository
      .createQueryBuilder('b')
      .innerJoin('b.shopCustomer', 'sc')
      .select('sc.id', 'shopCustomerId')
      .addSelect('b.balanceMinor', 'balanceMinor')
      .where('sc.id IN (:...ids)', { ids: customerIds })
      .andWhere('b.isDeleted = false')
      .getRawMany<{ shopCustomerId: string; balanceMinor: string }>();
    for (const row of rows) {
      map.set(row.shopCustomerId, Number(row.balanceMinor));
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
    const shopCustomerId = e.khataBook?.shopCustomer?.id;
    if (!shopCustomerId) {
      this.logger.error(
        `toEntryDto: missing khataBook.shopCustomer for entry ${e.id}`,
      );
      throw new InternalServerErrorException('Khata entry response mapping failed');
    }
    return {
      id: e.id,
      shopCustomerId,
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
