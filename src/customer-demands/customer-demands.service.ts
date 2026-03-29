import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { ContentKind } from '../content/content-kind.enum';
import { ContentService } from '../content/content.service';
import { ShopsService } from '../shops/shops.service';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';
import { MIN_RECEIPT_ORDER_TOTAL_MINOR } from './customer-demand.constants';
import { DemandInvitationsService } from './demand-invitations.service';
import { CreateCustomerDemandDto } from './dto/create-customer-demand.dto';
import { CustomerDemandAuditEntryDto } from './dto/customer-demand-audit-entry.dto';
import { CustomerDemandQuotationDto } from './dto/customer-demand-quotation.dto';
import { CustomerDemandResponseDto } from './dto/customer-demand-response.dto';
import { PublishCustomerDemandDto } from './dto/publish-customer-demand.dto';
import { UpdateCustomerDemandDto } from './dto/update-customer-demand.dto';
import { CustomerDemandAuditAction } from './enums/customer-demand-audit-action.enum';
import { CustomerDemandStatus } from './enums/customer-demand-status.enum';
import { CustomerDemandAudit } from './entities/customer-demand-audit.entity';
import { CustomerDemand } from './entities/customer-demand.entity';

@Injectable()
export class CustomerDemandsService {
  constructor(
    @InjectRepository(CustomerDemand)
    private readonly demandRepo: Repository<CustomerDemand>,
    @InjectRepository(CustomerDemandAudit)
    private readonly auditRepo: Repository<CustomerDemandAudit>,
    private readonly usersService: UsersService,
    private readonly contentService: ContentService,
    private readonly shopsService: ShopsService,
    private readonly demandInvitationsService: DemandInvitationsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(
    userId: string,
    dto: CreateCustomerDemandDto,
  ): Promise<CustomerDemandResponseDto> {
    await this.usersService.findOne(userId);
    if (dto.receiptContentId) {
      await this.assertReceiptImage(dto.receiptContentId);
    }

    return this.demandRepo.manager.transaction(async (em) => {
      const dRepo = em.getRepository(CustomerDemand);
      const row = dRepo.create({
        userId,
        title: dto.title.trim(),
        details: dto.details.trim(),
        budgetHint: dto.budgetHint?.trim() ?? null,
        receiptContentId: dto.receiptContentId ?? null,
        receiptOrderTotalMinor: dto.receiptOrderTotalMinor ?? null,
        deliveryLatitude: dto.deliveryLatitude ?? null,
        deliveryLongitude: dto.deliveryLongitude ?? null,
        status: CustomerDemandStatus.DRAFT,
        publishedAt: null,
        createdBy: userId,
        updatedBy: userId,
      });
      const saved = await dRepo.save(row);
      await this.appendAudit(em, saved.id, userId, CustomerDemandAuditAction.CREATED, {
        after: this.snapshot(saved),
      });
      return this.toResponse(await this.loadDemand(saved.id, em));
    });
  }

  async update(
    userId: string,
    demandId: string,
    dto: UpdateCustomerDemandDto,
  ): Promise<CustomerDemandResponseDto> {
    const existing = await this.findOneEntityForUser(userId, demandId);
    if (existing.status !== CustomerDemandStatus.DRAFT) {
      throw new BadRequestException(
        'Only DRAFT requests can be edited; close or create a new request.',
      );
    }
    const before = this.snapshot(existing);
    if (dto.receiptContentId !== undefined && dto.receiptContentId !== null) {
      await this.assertReceiptImage(dto.receiptContentId);
    }

    return this.demandRepo.manager.transaction(async (em) => {
      const dRepo = em.getRepository(CustomerDemand);
      const row = await dRepo.findOne({
        where: { id: demandId, userId, isDeleted: false },
      });
      if (!row) {
        throw new NotFoundException(`Demand ${demandId} not found`);
      }
      if (dto.title !== undefined) row.title = dto.title.trim();
      if (dto.details !== undefined) row.details = dto.details.trim();
      if (dto.budgetHint !== undefined) {
        row.budgetHint =
          dto.budgetHint === null ? null : dto.budgetHint.trim() || null;
      }
      if (dto.receiptContentId !== undefined) {
        row.receiptContentId = dto.receiptContentId;
      }
      if (dto.receiptOrderTotalMinor !== undefined) {
        row.receiptOrderTotalMinor = dto.receiptOrderTotalMinor;
      }
      if (dto.deliveryLatitude !== undefined) {
        row.deliveryLatitude = dto.deliveryLatitude;
      }
      if (dto.deliveryLongitude !== undefined) {
        row.deliveryLongitude = dto.deliveryLongitude;
      }
      row.updatedBy = userId;
      const saved = await dRepo.save(row);
      await this.appendAudit(em, demandId, userId, CustomerDemandAuditAction.UPDATED, {
        before,
        after: this.snapshot(saved),
      });
      return this.toResponse(await this.loadDemand(saved.id, em));
    });
  }

  async publish(
    userId: string,
    demandId: string,
    publishDto?: PublishCustomerDemandDto,
  ): Promise<CustomerDemandResponseDto> {
    const existing = await this.findOneEntityForUser(userId, demandId);
    if (existing.status !== CustomerDemandStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT requests can be published');
    }
    if (!existing.receiptContentId) {
      throw new BadRequestException(
        'Link a receipt image (content id) before publishing',
      );
    }
    if (
      existing.receiptOrderTotalMinor == null ||
      existing.receiptOrderTotalMinor < MIN_RECEIPT_ORDER_TOTAL_MINOR
    ) {
      throw new BadRequestException(
        `Receipt order total must be at least ₹${MIN_RECEIPT_ORDER_TOTAL_MINOR / 100} (${MIN_RECEIPT_ORDER_TOTAL_MINOR} paise)`,
      );
    }
    await this.assertReceiptImage(existing.receiptContentId);

    const lat =
      publishDto?.deliveryLatitude ?? existing.deliveryLatitude ?? null;
    const lng =
      publishDto?.deliveryLongitude ?? existing.deliveryLongitude ?? null;
    if (
      lat == null ||
      lng == null ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng)
    ) {
      throw new BadRequestException(
        'deliveryLatitude and deliveryLongitude are required to match shops (save on draft or pass in publish body)',
      );
    }

    const orderRupees = existing.receiptOrderTotalMinor / 100;
    const nearby = await this.shopsService.findDeliverableNearby(
      lat,
      lng,
      orderRupees,
    );
    const shopIds = nearby.map((s) => s.id);

    const before = this.snapshot(existing);
    return this.demandRepo.manager.transaction(async (em) => {
      const dRepo = em.getRepository(CustomerDemand);
      const row = await dRepo.findOne({
        where: { id: demandId, userId, isDeleted: false },
      });
      if (!row || row.status !== CustomerDemandStatus.DRAFT) {
        throw new NotFoundException(`Demand ${demandId} not found`);
      }
      row.status = CustomerDemandStatus.LIVE;
      row.publishedAt = new Date();
      row.deliveryLatitude = lat;
      row.deliveryLongitude = lng;
      row.updatedBy = userId;
      const saved = await dRepo.save(row);
      const invitations = await this.demandInvitationsService.bulkCreatePending(
        em,
        saved.id,
        shopIds,
        userId,
      );
      await this.notificationsService.recordSellerDemandInvites(em, {
        actorUserId: userId,
        demandId: saved.id,
        demandTitle: saved.title,
        invitations,
      });
      await this.appendAudit(em, demandId, userId, CustomerDemandAuditAction.PUBLISHED, {
        before,
        after: this.snapshot(saved),
        notifiedShopIds: shopIds,
        notifiedShopCount: shopIds.length,
      });
      const loaded = await this.loadDemand(saved.id, em);
      const statsMap = await this.demandInvitationsService.countStatsByDemandIds([
        loaded.id,
      ]);
      const stats = statsMap.get(loaded.id) ?? { notified: 0, quoted: 0 };
      return this.toResponse(loaded, stats);
    });
  }

  async close(userId: string, demandId: string): Promise<CustomerDemandResponseDto> {
    const existing = await this.findOneEntityForUser(userId, demandId);
    if (existing.status !== CustomerDemandStatus.LIVE) {
      throw new BadRequestException('Only LIVE requests can be closed this way');
    }
    const before = this.snapshot(existing);
    return this.demandRepo.manager.transaction(async (em) => {
      const dRepo = em.getRepository(CustomerDemand);
      const row = await dRepo.findOne({
        where: { id: demandId, userId, isDeleted: false },
      });
      if (!row) {
        throw new NotFoundException(`Demand ${demandId} not found`);
      }
      row.status = CustomerDemandStatus.CLOSED;
      row.updatedBy = userId;
      const saved = await dRepo.save(row);
      await this.appendAudit(em, demandId, userId, CustomerDemandAuditAction.STATUS_CHANGED, {
        before,
        after: this.snapshot(saved),
        note: 'Customer closed request',
      });
      const loaded = await this.loadDemand(saved.id, em);
      const statsMap = await this.demandInvitationsService.countStatsByDemandIds([
        loaded.id,
      ]);
      const stats = statsMap.get(loaded.id) ?? { notified: 0, quoted: 0 };
      return this.toResponse(loaded, stats);
    });
  }

  async remove(userId: string, demandId: string): Promise<void> {
    const existing = await this.findOneEntityForUser(userId, demandId);
    const before = this.snapshot(existing);
    await this.demandRepo.manager.transaction(async (em) => {
      const dRepo = em.getRepository(CustomerDemand);
      const row = await dRepo.findOne({
        where: { id: demandId, userId, isDeleted: false },
      });
      if (!row) {
        throw new NotFoundException(`Demand ${demandId} not found`);
      }
      row.isDeleted = true;
      row.updatedBy = userId;
      await dRepo.save(row);
      await this.appendAudit(em, demandId, userId, CustomerDemandAuditAction.SOFT_DELETED, {
        before,
        after: { ...this.snapshot(row), isDeleted: true },
      });
    });
  }

  async findOneForUser(
    userId: string,
    demandId: string,
  ): Promise<CustomerDemandResponseDto> {
    await this.usersService.findOne(userId);
    const row = await this.demandRepo.findOne({
      where: { id: demandId, userId, isDeleted: false },
      relations: ['receiptContent'],
    });
    if (!row) {
      throw new NotFoundException(`Demand ${demandId} not found`);
    }
    const statsMap = await this.demandInvitationsService.countStatsByDemandIds([
      row.id,
    ]);
    const stats = statsMap.get(row.id) ?? { notified: 0, quoted: 0 };
    return this.toResponse(row, stats);
  }

  async listForUser(userId: string): Promise<CustomerDemandResponseDto[]> {
    await this.usersService.findOne(userId);
    const rows = await this.demandRepo.find({
      where: { userId, isDeleted: false },
      relations: ['receiptContent'],
      order: { updatedAt: 'DESC' },
    });
    const ids = rows.map((r) => r.id);
    const statsMap = await this.demandInvitationsService.countStatsByDemandIds(ids);
    return rows.map((r) =>
      this.toResponse(
        r,
        statsMap.get(r.id) ?? { notified: 0, quoted: 0 },
      ),
    );
  }

  async listLive(): Promise<CustomerDemandResponseDto[]> {
    const rows = await this.demandRepo.find({
      where: { status: CustomerDemandStatus.LIVE, isDeleted: false },
      relations: ['receiptContent'],
      order: { publishedAt: 'DESC' },
    });
    const ids = rows.map((r) => r.id);
    const statsMap = await this.demandInvitationsService.countStatsByDemandIds(ids);
    return rows.map((r) =>
      this.toResponse(
        r,
        statsMap.get(r.id) ?? { notified: 0, quoted: 0 },
      ),
    );
  }

  async listQuotationsForCustomer(
    userId: string,
    demandId: string,
  ): Promise<CustomerDemandQuotationDto[]> {
    return this.demandInvitationsService.listQuotationsForCustomer(
      userId,
      demandId,
    );
  }

  async listAuditLog(
    userId: string,
    demandId: string,
  ): Promise<CustomerDemandAuditEntryDto[]> {
    await this.usersService.findOne(userId);
    const owned = await this.demandRepo.findOne({ where: { id: demandId, userId } });
    if (!owned) {
      throw new NotFoundException(`Demand ${demandId} not found`);
    }
    const rows = await this.auditRepo.find({
      where: { demandId },
      order: { occurredAt: 'ASC' },
    });
    return rows.map((r) => this.auditToDto(r));
  }

  private async findOneEntityForUser(
    userId: string,
    demandId: string,
  ): Promise<CustomerDemand> {
    await this.usersService.findOne(userId);
    const row = await this.demandRepo.findOne({
      where: { id: demandId, userId, isDeleted: false },
      relations: ['receiptContent'],
    });
    if (!row) {
      throw new NotFoundException(`Demand ${demandId} not found`);
    }
    return row;
  }

  private async loadDemand(
    id: string,
    em: EntityManager,
  ): Promise<CustomerDemand> {
    const row = await em.getRepository(CustomerDemand).findOne({
      where: { id, isDeleted: false },
      relations: ['receiptContent'],
    });
    if (!row) {
      throw new NotFoundException(`Demand ${id} not found`);
    }
    return row;
  }

  private async assertReceiptImage(contentId: string): Promise<void> {
    const c = await this.contentService.findOne(contentId);
    if (c.kind !== ContentKind.IMAGE) {
      throw new BadRequestException(
        `Content ${contentId} must have kind IMAGE for a receipt`,
      );
    }
  }

  private snapshot(d: CustomerDemand): Record<string, unknown> {
    return {
      title: d.title,
      details: d.details,
      budgetHint: d.budgetHint,
      receiptContentId: d.receiptContentId,
      receiptOrderTotalMinor: d.receiptOrderTotalMinor,
      status: d.status,
      publishedAt: d.publishedAt ? d.publishedAt.toISOString() : null,
      deliveryLatitude: d.deliveryLatitude,
      deliveryLongitude: d.deliveryLongitude,
    };
  }

  private async appendAudit(
    em: EntityManager,
    demandId: string,
    actorUserId: string,
    action: CustomerDemandAuditAction,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const repo = em.getRepository(CustomerDemandAudit);
    const audit = repo.create({
      demandId,
      actorUserId,
      action,
      payload,
    });
    await repo.save(audit);
  }

  private toResponse(
    row: CustomerDemand,
    stats?: { notified: number; quoted: number },
  ): CustomerDemandResponseDto {
    const url = row.receiptContent?.storageUrl?.trim();
    return {
      id: row.id,
      userId: row.userId,
      title: row.title,
      details: row.details,
      budgetHint: row.budgetHint,
      receiptContentId: row.receiptContentId,
      receiptImageUrl: url && url.length > 0 ? url : null,
      receiptOrderTotalMinor: row.receiptOrderTotalMinor,
      status: row.status,
      publishedAt: row.publishedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deliveryLatitude: row.deliveryLatitude,
      deliveryLongitude: row.deliveryLongitude,
      notifiedShopCount: stats?.notified ?? 0,
      quotationCount: stats?.quoted ?? 0,
    };
  }

  private auditToDto(row: CustomerDemandAudit): CustomerDemandAuditEntryDto {
    return {
      id: row.id,
      demandId: row.demandId,
      occurredAt: row.occurredAt,
      actorUserId: row.actorUserId,
      action: row.action,
      payload: row.payload,
    };
  }
}
