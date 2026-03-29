import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
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
import { StorageService } from '../storage/storage.service';
import { CustomerDemand } from './entities/customer-demand.entity';
import { DemandShopInvitation } from './entities/demand-shop-invitation.entity';
import { ShopProduct } from '../shop-products/entities/shop-product.entity';
import type { QuotedLineItemSnapshot } from './types/quoted-line-item.types';
import { parseQuotedLineItems } from './types/quoted-line-item.types';

@Injectable()
export class DemandInvitationsService {
  constructor(
    @InjectRepository(DemandShopInvitation)
    private readonly invitationRepo: Repository<DemandShopInvitation>,
    @InjectRepository(CustomerDemand)
    private readonly demandRepo: Repository<CustomerDemand>,
    @InjectRepository(ShopProduct)
    private readonly shopProductRepo: Repository<ShopProduct>,
    private readonly shopsService: ShopsService,
    private readonly contentService: ContentService,
    private readonly notificationsService: NotificationsService,
    private readonly storageService: StorageService,
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
    const filtered = rows.filter(
      (i) =>
        i.demand &&
        !i.demand.isDeleted &&
        i.demand.status === CustomerDemandStatus.LIVE,
    );
    return Promise.all(filtered.map((i) => this.toShopView(i)));
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
    inv.quotedLineItems = null;
    inv.respondedAt = new Date();
    inv.respondedByUserId = shop.userId;
    inv.updatedBy = shop.userId;
    const saved = await this.invitationRepo.save(inv);
    await this.notificationsService.markSellerInviteReadForInvitation(
      invitationId,
    );
    return await this.toShopView(await this.reloadInvitation(saved.id));
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
    let quotedSnapshots: QuotedLineItemSnapshot[] | null = null;
    if (dto.lineItems && dto.lineItems.length > 0) {
      const mergedQty = new Map<string, number>();
      for (const li of dto.lineItems) {
        mergedQty.set(
          li.shopProductId,
          (mergedQty.get(li.shopProductId) ?? 0) + li.quantity,
        );
      }
      const ids = [...mergedQty.keys()];
      const listings = await this.shopProductRepo.find({
        where: { id: In(ids), shopId, isDeleted: false },
        relations: { product: true },
      });
      if (listings.length !== ids.length) {
        throw new BadRequestException(
          'One or more line items are not valid listings for your shop',
        );
      }
      const byId = new Map(listings.map((s) => [s.id, s] as const));
      quotedSnapshots = [];
      for (const [shopProductId, quantity] of mergedQty) {
        const sp = byId.get(shopProductId)!;
        if (!sp.isListed) {
          throw new BadRequestException(
            `Listing "${sp.product.name}" is not available for quotation`,
          );
        }
        if (quantity < sp.minOrderQuantity) {
          throw new BadRequestException(
            `Minimum quantity for "${sp.product.name}" is ${sp.minOrderQuantity}`,
          );
        }
        if (quantity > sp.quantity) {
          throw new BadRequestException(
            `Not enough stock for "${sp.product.name}" to offer this quantity`,
          );
        }
        quotedSnapshots.push({
          shopProductId: sp.id,
          quantity,
          productNameSnapshot: sp.product.name.slice(0, 300),
          unitPriceMinor: sp.priceMinor,
          unit: sp.unit,
        });
      }
    }
    inv.responseKind = DemandShopInvitationResponse.QUOTED;
    inv.rejectReason = null;
    inv.quotationText = dto.quotationText.trim();
    inv.quotationDocumentContentId =
      dto.quotationDocumentContentId?.trim() ?? null;
    inv.respondedAt = new Date();
    inv.respondedByUserId = shop.userId;
    inv.updatedBy = shop.userId;
    inv.quotedLineItems = quotedSnapshots;
    const saved = await this.invitationRepo.save(inv);
    const customerUserId = inv.demand?.userId;
    await this.notificationsService.markSellerInviteReadForInvitation(
      invitationId,
    );
    if (customerUserId) {
      await this.notificationsService.recordCustomerQuotation({
        customerUserId,
        demandId: inv.demandId,
        invitationId: inv.id,
        shopDisplayName: shop.displayName,
        actorUserId: shop.userId,
      });
    }
    return await this.toShopView(await this.reloadInvitation(saved.id));
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
    return Promise.all(
      rows.map(async (r) => {
        const raw = r.quotationDocument?.storageUrl?.trim();
        const quotationDocumentUrl =
          raw && raw.length > 0
            ? await this.storageService.toReadableUrl(raw)
            : null;
        return {
          invitationId: r.id,
          shopId: r.shopId,
          shopDisplayName: r.shop.displayName,
          quotationText: r.quotationText ?? '',
          quotationDocumentUrl,
          respondedAt: r.respondedAt!,
          quotedLineItems: parseQuotedLineItems(r.quotedLineItems),
        };
      }),
    );
  }

  async assertAwardedQuotationCheckoutInTx(
    em: EntityManager,
    customerUserId: string,
    invitationId: string,
    cartLines: Map<string, number>,
  ): Promise<{ demandId: string; expectedShopId: string }> {
    const inv = await em.getRepository(DemandShopInvitation).findOne({
      where: { id: invitationId, isDeleted: false },
      relations: ['demand'],
    });
    if (!inv) {
      throw new NotFoundException('Quotation not found');
    }
    const d = inv.demand;
    if (!d || d.isDeleted) {
      throw new BadRequestException('This request is no longer available');
    }
    if (d.userId !== customerUserId) {
      throw new ForbiddenException('This quotation belongs to another customer');
    }
    if (d.status !== CustomerDemandStatus.AWARDED) {
      throw new BadRequestException(
        'Choose a shop quotation before checking out',
      );
    }
    if (d.awardedInvitationId !== invitationId) {
      throw new BadRequestException(
        'You accepted a different quotation — refresh and use that checkout link',
      );
    }
    if (inv.responseKind !== DemandShopInvitationResponse.QUOTED) {
      throw new BadRequestException('This quotation is no longer active');
    }
    const quoted = parseQuotedLineItems(inv.quotedLineItems);
    if (quoted.length === 0) {
      throw new BadRequestException(
        'This quotation has no product lines for checkout. Ask the seller to send a new quote with line items.',
      );
    }
    const quoteMap = new Map<string, number>();
    for (const q of quoted) {
      quoteMap.set(
        q.shopProductId,
        (quoteMap.get(q.shopProductId) ?? 0) + q.quantity,
      );
    }
    if (quoteMap.size !== cartLines.size) {
      throw new BadRequestException(
        'Your basket must match the quoted items exactly',
      );
    }
    for (const [k, v] of quoteMap) {
      if (cartLines.get(k) !== v) {
        throw new BadRequestException(
          'Quantities must match the quotation exactly',
        );
      }
    }
    return { demandId: d.id, expectedShopId: inv.shopId };
  }

  async findQuotedInvitationForDemand(
    demandId: string,
    invitationId: string,
  ): Promise<DemandShopInvitation | null> {
    return this.invitationRepo.findOne({
      where: {
        id: invitationId,
        demandId,
        isDeleted: false,
        responseKind: DemandShopInvitationResponse.QUOTED,
      },
      relations: ['shop'],
    });
  }

  async getInvitationWithShop(
    invitationId: string,
  ): Promise<DemandShopInvitation | null> {
    return this.invitationRepo.findOne({
      where: { id: invitationId, isDeleted: false },
      relations: ['shop'],
    });
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
      throw new BadRequestException(
        'This demand is no longer open for responses',
      );
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

  private async toShopView(
    inv: DemandShopInvitation,
  ): Promise<ShopDemandInvitationViewDto> {
    const d = inv.demand;
    const receiptUrl = d.receiptContent?.storageUrl?.trim();
    const docUrl = inv.quotationDocument?.storageUrl?.trim();
    const customerReceiptImageUrl =
      receiptUrl && receiptUrl.length > 0
        ? await this.storageService.toReadableUrl(receiptUrl)
        : null;
    const quotationDocumentUrl =
      docUrl && docUrl.length > 0
        ? await this.storageService.toReadableUrl(docUrl)
        : null;
    return {
      invitationId: inv.id,
      demandId: d.id,
      demandTitle: d.title,
      demandDetails: d.details,
      demandBudgetHint: d.budgetHint,
      customerReceiptImageUrl,
      receiptOrderTotalMinor: d.receiptOrderTotalMinor,
      demandStatus: d.status,
      responseKind: inv.responseKind,
      rejectReason: inv.rejectReason,
      quotationText: inv.quotationText,
      quotationDocumentUrl,
      respondedAt: inv.respondedAt,
      quotedLineItems: parseQuotedLineItems(inv.quotedLineItems),
    };
  }
}
