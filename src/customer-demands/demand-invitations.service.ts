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
import { CustomerDemandQuotationDto } from './dto/customer-demand-quotation.dto';
import { RejectDemandInvitationDto } from './dto/reject-demand-invitation.dto';
import { ShopDemandInvitationViewDto } from './dto/shop-demand-invitation-view.dto';
import { SubmitDemandQuotationDto } from './dto/submit-demand-quotation.dto';
import { CustomerDemandStatus } from './enums/customer-demand-status.enum';
import { DemandShopInvitationResponse } from './enums/demand-shop-invitation-response.enum';
import { NotificationsService } from '../notifications/notifications.service';
import { CustomerDemand } from './entities/customer-demand.entity';
import { DemandShopInvitation } from './entities/demand-shop-invitation.entity';

@Injectable()
export class DemandInvitationsService {
  constructor(
    @InjectRepository(DemandShopInvitation)
    private readonly invitationRepo: Repository<DemandShopInvitation>,
    @InjectRepository(CustomerDemand)
    private readonly demandRepo: Repository<CustomerDemand>,
    private readonly shopsService: ShopsService,
    private readonly contentService: ContentService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async bulkCreatePending(
    em: EntityManager,
    demandId: string,
    shopIds: string[],
    actorUserId: string,
  ): Promise<DemandShopInvitation[]> {
    if (shopIds.length === 0) {
      return [];
    }
    const repo = em.getRepository(DemandShopInvitation);
    const rows = shopIds.map((shopId) =>
      repo.create({
        demandId,
        shopId,
        responseKind: DemandShopInvitationResponse.PENDING,
        createdBy: actorUserId,
        updatedBy: actorUserId,
      }),
    );
    return repo.save(rows);
  }

  async listForShop(shopId: string): Promise<ShopDemandInvitationViewDto[]> {
    await this.shopsService.findOne(shopId);
    const rows = await this.invitationRepo.find({
      where: { shopId, isDeleted: false },
      relations: ['demand', 'demand.receiptContent', 'quotationDocument'],
      order: { createdAt: 'DESC' },
    });
    return rows
      .filter(
        (i) =>
          i.demand &&
          !i.demand.isDeleted &&
          i.demand.status === CustomerDemandStatus.LIVE,
      )
      .map((i) => this.toShopView(i));
  }

  async rejectInvitation(
    shopId: string,
    invitationId: string,
    dto: RejectDemandInvitationDto,
  ): Promise<ShopDemandInvitationViewDto> {
    const shop = await this.shopsService.findOne(shopId);
    const inv = await this.invitationRepo.findOne({
      where: { id: invitationId, shopId, isDeleted: false },
      relations: ['demand', 'demand.receiptContent', 'quotationDocument'],
    });
    if (!inv) {
      throw new NotFoundException(`Invitation ${invitationId} not found`);
    }
    this.assertDemandLive(inv);
    if (inv.responseKind !== DemandShopInvitationResponse.PENDING) {
      throw new BadRequestException('This invitation was already answered');
    }
    inv.responseKind = DemandShopInvitationResponse.REJECTED;
    inv.rejectReason = dto.reason?.trim() ? dto.reason.trim() : null;
    inv.quotationText = null;
    inv.quotationDocumentContentId = null;
    inv.respondedAt = new Date();
    inv.respondedByUserId = shop.userId;
    inv.updatedBy = shop.userId;
    const saved = await this.invitationRepo.save(inv);
    await this.notificationsService.markSellerInviteReadForInvitation(invitationId);
    return this.toShopView(
      await this.reloadInvitation(saved.id),
    );
  }

  async submitQuotation(
    shopId: string,
    invitationId: string,
    dto: SubmitDemandQuotationDto,
  ): Promise<ShopDemandInvitationViewDto> {
    const shop = await this.shopsService.findOne(shopId);
    const inv = await this.invitationRepo.findOne({
      where: { id: invitationId, shopId, isDeleted: false },
      relations: ['demand', 'demand.receiptContent', 'quotationDocument'],
    });
    if (!inv) {
      throw new NotFoundException(`Invitation ${invitationId} not found`);
    }
    this.assertDemandLive(inv);
    if (inv.responseKind !== DemandShopInvitationResponse.PENDING) {
      throw new BadRequestException('This invitation was already answered');
    }
    if (dto.quotationDocumentContentId) {
      await this.assertQuotationAttachment(dto.quotationDocumentContentId);
    }
    inv.responseKind = DemandShopInvitationResponse.QUOTED;
    inv.rejectReason = null;
    inv.quotationText = dto.quotationText.trim();
    inv.quotationDocumentContentId =
      dto.quotationDocumentContentId?.trim() ?? null;
    inv.respondedAt = new Date();
    inv.respondedByUserId = shop.userId;
    inv.updatedBy = shop.userId;
    const saved = await this.invitationRepo.save(inv);
    const customerUserId = inv.demand?.userId;
    await this.notificationsService.markSellerInviteReadForInvitation(invitationId);
    if (customerUserId) {
      await this.notificationsService.recordCustomerQuotation({
        customerUserId,
        demandId: inv.demandId,
        invitationId: inv.id,
        shopDisplayName: shop.displayName,
        actorUserId: shop.userId,
      });
    }
    return this.toShopView(await this.reloadInvitation(saved.id));
  }

  async listQuotationsForCustomer(
    customerUserId: string,
    demandId: string,
  ): Promise<CustomerDemandQuotationDto[]> {
    const demand = await this.demandRepo.findOne({
      where: { id: demandId, userId: customerUserId, isDeleted: false },
    });
    if (!demand) {
      throw new NotFoundException(`Demand ${demandId} not found`);
    }
    const rows = await this.invitationRepo.find({
      where: {
        demandId,
        responseKind: DemandShopInvitationResponse.QUOTED,
        isDeleted: false,
      },
      relations: ['shop', 'quotationDocument'],
      order: { respondedAt: 'DESC' },
    });
    return rows.map((r) => ({
      invitationId: r.id,
      shopId: r.shopId,
      shopDisplayName: r.shop.displayName,
      quotationText: r.quotationText ?? '',
      quotationDocumentUrl:
        r.quotationDocument?.storageUrl?.trim() &&
        r.quotationDocument.storageUrl.length > 0
          ? r.quotationDocument.storageUrl.trim()
          : null,
      respondedAt: r.respondedAt!,
    }));
  }

  async countStatsByDemandIds(
    demandIds: string[],
  ): Promise<Map<string, { notified: number; quoted: number }>> {
    const map = new Map<string, { notified: number; quoted: number }>();
    if (demandIds.length === 0) {
      return map;
    }
    const raw = await this.invitationRepo
      .createQueryBuilder('i')
      .select('i.demandId', 'demandId')
      .addSelect('COUNT(*)', 'notified')
      .addSelect(
        `SUM(CASE WHEN i.responseKind = :quoted THEN 1 ELSE 0 END)`,
        'quoted',
      )
      .where('i.demandId IN (:...ids)', { ids: demandIds })
      .andWhere('i.isDeleted = false')
      .setParameter('quoted', DemandShopInvitationResponse.QUOTED)
      .groupBy('i.demandId')
      .getRawMany<{ demandId: string; notified: string; quoted: string }>();
    for (const r of raw) {
      map.set(r.demandId, {
        notified: Number(r.notified),
        quoted: Number(r.quoted),
      });
    }
    return map;
  }

  private assertDemandLive(inv: DemandShopInvitation): void {
    if (
      !inv.demand ||
      inv.demand.isDeleted ||
      inv.demand.status !== CustomerDemandStatus.LIVE
    ) {
      throw new BadRequestException('This demand is no longer open for responses');
    }
  }

  private async assertQuotationAttachment(contentId: string): Promise<void> {
    const c = await this.contentService.findOne(contentId);
    if (
      c.kind !== ContentKind.IMAGE &&
      c.kind !== ContentKind.DOCUMENT &&
      c.kind !== ContentKind.BILL
    ) {
      throw new BadRequestException(
        'Quotation attachment must be content kind IMAGE, DOCUMENT, or BILL',
      );
    }
  }

  private async reloadInvitation(id: string): Promise<DemandShopInvitation> {
    const row = await this.invitationRepo.findOne({
      where: { id },
      relations: ['demand', 'demand.receiptContent', 'quotationDocument'],
    });
    if (!row) {
      throw new NotFoundException(`Invitation ${id} not found`);
    }
    return row;
  }

  private toShopView(inv: DemandShopInvitation): ShopDemandInvitationViewDto {
    const d = inv.demand;
    const receiptUrl = d.receiptContent?.storageUrl?.trim();
    const docUrl = inv.quotationDocument?.storageUrl?.trim();
    return {
      invitationId: inv.id,
      demandId: d.id,
      demandTitle: d.title,
      demandDetails: d.details,
      demandBudgetHint: d.budgetHint,
      customerReceiptImageUrl:
        receiptUrl && receiptUrl.length > 0 ? receiptUrl : null,
      receiptOrderTotalMinor: d.receiptOrderTotalMinor,
      demandStatus: d.status,
      responseKind: inv.responseKind,
      rejectReason: inv.rejectReason,
      quotationText: inv.quotationText,
      quotationDocumentUrl:
        docUrl && docUrl.length > 0 ? docUrl : null,
      respondedAt: inv.respondedAt,
    };
  }
}
