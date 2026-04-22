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

  /**
   * Returns one DTO per shop customer, driven by khata_books so the balance
   * (already denormalized in balanceMinor) is read in a single JOIN — no
   * separate aggregation step and no risk of duplicate rows.
   */
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

      const qb = this.khataBooksRepository
        .createQueryBuilder('b')
        .innerJoinAndSelect('b.shopCustomer', 'sc')
        .where('b.shopId = :shopId', { shopId })
        .andWhere('b.isDeleted = false')
        .andWhere('sc.isDeleted = false');

      if (safeForLike) {
        const like = `%${safeForLike}%`;
        const digitsOnly = raw.replace(/\D/g, '');
        qb.andWhere(
          new Brackets((wb) => {
            wb.where('sc.displayName ILIKE :like', { like }).orWhere(
              'sc.phone ILIKE :like',
              { like },
            );
            if (digitsOnly.length >= 2) {
              wb.orWhere(
                "regexp_replace(COALESCE(sc.phone, ''), '[^0-9]', '', 'g') LIKE :digitsLike",
                { digitsLike: `%${digitsOnly}%` },
              );
            }
          }),
        );
      }

      qb.orderBy('sc.displayName', 'ASC').addOrderBy('sc.createdAt', 'DESC');

      const books = await qb.getMany();
      return books.map((b) => this.bookToCustomerDto(b));
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
    const book = await this.requireKhataBookWithCustomer(shopId, customerId);
    return this.bookToCustomerDto(book);
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
      // Explicit userId provided — validate it exists
      const u = await this.usersService.findOne(userId);
      if (!displayName) {
        displayName = `${u.firstName} ${u.lastName}`.trim();
      }
    } else {
      // No userId — find or create a stub user so userId is never null
      if (!displayName) {
        throw new ConflictException(
          'displayName is required when userId is not linked',
        );
      }
      const stubUser = await this.usersService.findOrCreateStub({
        displayName,
        phone: dto.phone,
        email: dto.email,
      });
      userId = stubUser.id;
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
      email: dto.email?.trim().toLowerCase() || null,
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
    // Re-load with the relation so bookToCustomerDto can read sc fields.
    const saved = await this.requireKhataBookWithCustomer(shopId, row.id);
    return this.bookToCustomerDto(saved);
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
    if (dto.email !== undefined) {
      customer.email = dto.email?.trim().toLowerCase() || null;
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
    const book = await this.requireKhataBookWithCustomer(shopId, customerId);
    return this.bookToCustomerDto(book);
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

  // ── Private helpers ─────────────────────────────────────────────────────────

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

  /** Finds the KhataBook (without loading relations) — used for write paths. */
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

  /** Finds the KhataBook with shopCustomer loaded — used for read/response paths. */
  private async requireKhataBookWithCustomer(
    shopId: string,
    shopCustomerId: string,
  ): Promise<KhataBook> {
    const book = await this.khataBooksRepository
      .createQueryBuilder('b')
      .innerJoinAndSelect('b.shopCustomer', 'sc')
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
   * Creates missing khata_books rows for active shop_customers (idempotent safety net).
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

  private bookToCustomerDto(b: KhataBook): ShopCustomerResponseDto {
    const sc = b.shopCustomer;
    return {
      id: sc.id,
      shopId: b.shopId,
      userId: b.userId,
      displayName: sc.displayName,
      phone: sc.phone,
      email: sc.email,
      notes: sc.notes,
      outstandingBalanceMinor: b.balanceMinor,
      hasOutstanding: b.balanceMinor > 0,
      createdAt: sc.createdAt,
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

  /**
   * Idempotent — called after a buyer places an order so they appear in the
   * seller's customer list automatically. No-ops if the customer row already exists.
   */
  async ensureShopCustomerForBuyer(
    shopId: string,
    buyerUserId: string,
  ): Promise<void> {
    // Already exists (active or soft-deleted)
    const existing = await this.shopCustomersRepository.findOne({
      where: { shopId, userId: buyerUserId },
    });
    if (existing) {
      // If soft-deleted, revive them
      if (existing.isDeleted) {
        await this.shopCustomersRepository.update(
          { id: existing.id },
          { isDeleted: false },
        );
        await this.khataBooksRepository
          .createQueryBuilder()
          .update(KhataBook)
          .set({ isDeleted: false })
          .where('"shopCustomerId" = :id', { id: existing.id })
          .execute();
      }
      return;
    }

    const buyer = await this.usersService.findOne(buyerUserId);
    const displayName =
      `${buyer.firstName} ${buyer.lastName}`.trim() || 'Customer';

    const row = this.shopCustomersRepository.create({
      shopId,
      userId: buyerUserId,
      displayName,
      phone: buyer.phoneNumber !== '-' ? buyer.phoneNumber : null,
      email: buyer.email.endsWith('@firebase.dukaanpro.internal')
        ? null
        : buyer.email,
      notes: null,
    });
    try {
      await this.shopCustomersRepository.save(row);
    } catch (e) {
      // Unique violation — concurrent request already created the row
      this.rethrowUniqueShopUser(e);
      return;
    }

    const book = this.khataBooksRepository.create({
      shopId,
      shopCustomer: { id: row.id } as ShopCustomer,
      userId: buyerUserId,
      balanceMinor: 0,
    });
    await this.khataBooksRepository.save(book);
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
