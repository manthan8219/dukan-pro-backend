import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, EntityManager, In, IsNull, Repository } from 'typeorm';
import type { DemandShopInvitation } from '../customer-demands/entities/demand-shop-invitation.entity';
import { Shop } from '../shops/entities/shop.entity';
import { ShopsService } from '../shops/shops.service';
import { UsersService } from '../users/users.service';
import { MarkNotificationsReadDto } from './dto/mark-notifications-read.dto';
import { NotificationListItemDto } from './dto/notification-list-item.dto';
import { NotificationSummaryDto } from './dto/notification-summary.dto';
import { UserNotificationType } from './enums/user-notification-type.enum';
import { UserNotification } from './entities/user-notification.entity';
import {
  CUSTOMER_APP_NOTIFICATION_TYPES,
  InvitationKind,
  SELLER_HUB_NOTIFICATION_TYPES,
} from './notification-hub.constants';
import { FcmPushService } from './fcm-push.service';

const MONTHLY_INSIGHTS_CHECK_MS = 60 * 60 * 1000;

@Injectable()
export class NotificationsService implements OnModuleInit {
  constructor(
    @InjectRepository(UserNotification)
    private readonly notifRepo: Repository<UserNotification>,
    private readonly usersService: UsersService,
    private readonly shopsService: ShopsService,
    private readonly fcmPush: FcmPushService,
  ) {}

  onModuleInit(): void {
    if (process.env.NODE_ENV === 'test') {
      return;
    }
    setInterval(
      () => void this.maybeEmitMonthlySellerInsights(),
      MONTHLY_INSIGHTS_CHECK_MS,
    );
  }

  async getSummary(userId: string): Promise<NotificationSummaryDto> {
    await this.usersService.findOne(userId);
    const raw = await this.notifRepo
      .createQueryBuilder('n')
      .select('n.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('n.userId = :userId', { userId })
      .andWhere('n.readAt IS NULL')
      .andWhere('n.isDeleted = false')
      .groupBy('n.type')
      .getRawMany<{ type: UserNotificationType; count: string }>();

    const unreadByType: Record<string, number> = {};
    let totalUnread = 0;
    for (const r of raw) {
      const c = Number(r.count);
      unreadByType[r.type] = c;
      totalUnread += c;
    }

    const sumTypes = (types: UserNotificationType[]) =>
      types.reduce((s, t) => s + (unreadByType[t] ?? 0), 0);

    const sellerHubUnread = sumTypes(SELLER_HUB_NOTIFICATION_TYPES);
    const customerAppUnread = sumTypes(CUSTOMER_APP_NOTIFICATION_TYPES);
    const customerNewQuotationsUnread =
      unreadByType[UserNotificationType.CUSTOMER_NEW_QUOTATION] ?? 0;

    const demandInviteRows = await this.notifRepo
      .createQueryBuilder('n')
      .select('COUNT(*)', 'count')
      .where('n.userId = :userId', { userId })
      .andWhere('n.readAt IS NULL')
      .andWhere('n.isDeleted = false')
      .andWhere(
        new Brackets((qb) => {
          qb.where('n.type = :legacy', {
            legacy: UserNotificationType.SELLER_DEMAND_INVITATION,
          }).orWhere(
            `(n.type = :inv AND n.context->>'invitationKind' = :demandShop)`,
            {
              inv: UserNotificationType.INVITATION,
              demandShop: InvitationKind.DEMAND_SHOP,
            },
          );
        }),
      )
      .getRawOne<{ count: string }>();

    const sellerDemandInvitesUnread = Number(demandInviteRows?.count ?? 0);

    return {
      totalUnread,
      sellerHubUnread,
      customerAppUnread,
      sellerDemandInvitesUnread,
      customerNewQuotationsUnread,
      unreadByType,
    };
  }

  async markRead(
    userId: string,
    dto: MarkNotificationsReadDto,
  ): Promise<NotificationSummaryDto> {
    await this.usersService.findOne(userId);
    const now = new Date();

    const qb = this.notifRepo
      .createQueryBuilder()
      .update(UserNotification)
      .set({ readAt: now, updatedBy: userId })
      .where('userId = :userId', { userId })
      .andWhere('readAt IS NULL')
      .andWhere('isDeleted = false');

    if (dto.all) {
      await qb.execute();
    } else if (dto.demandId) {
      await qb
        .andWhere('type = :t', {
          t: UserNotificationType.CUSTOMER_NEW_QUOTATION,
        })
        .andWhere(`"context"->>'demandId' = :demandId`, {
          demandId: dto.demandId,
        })
        .execute();
    } else if (dto.types?.length) {
      await qb.andWhere('type IN (:...types)', { types: dto.types }).execute();
    } else {
      await qb.execute();
    }

    return this.getSummary(userId);
  }

  async listForUser(
    userId: string,
    opts: {
      limit?: number;
      unreadOnly?: boolean;
      types?: UserNotificationType[];
    },
  ): Promise<NotificationListItemDto[]> {
    await this.usersService.findOne(userId);
    const limit = Math.min(Math.max(opts.limit ?? 25, 1), 50);
    const unreadOnly = opts.unreadOnly !== false;
    const qb = this.notifRepo
      .createQueryBuilder('n')
      .where('n.userId = :userId', { userId })
      .andWhere('n.isDeleted = false');
    if (unreadOnly) {
      qb.andWhere('n.readAt IS NULL');
    }
    if (opts.types?.length) {
      qb.andWhere('n.type IN (:...types)', { types: opts.types });
    }
    qb.orderBy('n.createdAt', 'DESC').take(limit);
    const rows = await qb.getMany();
    return rows.map((n) => this.toListItemDto(n));
  }

  async markOneRead(
    userId: string,
    notificationId: string,
  ): Promise<NotificationSummaryDto> {
    await this.usersService.findOne(userId);
    const row = await this.notifRepo.findOne({
      where: { id: notificationId, userId, isDeleted: false },
    });
    if (!row) {
      throw new NotFoundException(`Notification ${notificationId} not found`);
    }
    if (!row.readAt) {
      row.readAt = new Date();
      row.updatedBy = userId;
      await this.notifRepo.save(row);
    }
    return this.getSummary(userId);
  }

  private toListItemDto(n: UserNotification): NotificationListItemDto {
    return {
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      readAt: n.readAt,
      createdAt: n.createdAt,
      invitationId: n.invitationId,
      dedupeKey: n.dedupeKey,
      context: n.context,
    };
  }

  /**
   * Inserts one unread row per invitation (shop owner is recipient). Must run inside the publish transaction.
   */
  async recordSellerDemandInvites(
    em: EntityManager,
    args: {
      actorUserId: string;
      demandId: string;
      demandTitle: string;
      invitations: DemandShopInvitation[];
    },
  ): Promise<void> {
    const { actorUserId, demandId, demandTitle, invitations } = args;
    if (invitations.length === 0) {
      return;
    }
    const shopRepo = em.getRepository(Shop);
    const shopIds = [...new Set(invitations.map((i) => i.shopId))];
    const shops = await shopRepo.find({ where: { id: In(shopIds) } });
    const ownerByShop = new Map(shops.map((s) => [s.id, s.userId] as const));
    const notifRepo = em.getRepository(UserNotification);
    const rows: UserNotification[] = [];
    for (const inv of invitations) {
      const ownerUserId = ownerByShop.get(inv.shopId);
      if (!ownerUserId) {
        continue;
      }
      const dedupeKey = `demand-shop-inv:${inv.id}`;
      const existing = await notifRepo.findOne({
        where: { userId: ownerUserId, dedupeKey },
      });
      if (existing) {
        continue;
      }
      rows.push(
        notifRepo.create({
          userId: ownerUserId,
          type: UserNotificationType.INVITATION,
          title: 'New buyer request',
          body:
            demandTitle.length > 500
              ? demandTitle.slice(0, 497) + '…'
              : demandTitle,
          readAt: null,
          invitationId: inv.id,
          dedupeKey,
          context: {
            invitationKind: InvitationKind.DEMAND_SHOP,
            demandId,
            invitationId: inv.id,
            shopId: inv.shopId,
          },
          createdBy: actorUserId,
          updatedBy: actorUserId,
          isDeleted: false,
        }),
      );
    }
    if (rows.length > 0) {
      await notifRepo.save(rows);
    }
  }

  async markSellerInviteReadForInvitation(invitationId: string): Promise<void> {
    await this.notifRepo.update(
      {
        invitationId,
        readAt: IsNull(),
        type: In([
          UserNotificationType.INVITATION,
          UserNotificationType.SELLER_DEMAND_INVITATION,
        ]),
      },
      { readAt: new Date() },
    );
  }

  async recordCustomerQuotation(args: {
    customerUserId: string;
    demandId: string;
    invitationId: string;
    shopDisplayName: string;
    actorUserId: string;
  }): Promise<void> {
    const dedupeKey = `cust-quotation:${args.invitationId}`;
    const dup = await this.notifRepo.findOne({
      where: { userId: args.customerUserId, dedupeKey },
    });
    if (dup) {
      return;
    }
    await this.notifRepo.save(
      this.notifRepo.create({
        userId: args.customerUserId,
        type: UserNotificationType.CUSTOMER_NEW_QUOTATION,
        title: `${args.shopDisplayName} sent a quotation`,
        body: null,
        readAt: null,
        invitationId: args.invitationId,
        dedupeKey,
        context: {
          demandId: args.demandId,
          invitationId: args.invitationId,
          shopDisplayName: args.shopDisplayName,
        },
        createdBy: args.actorUserId,
        updatedBy: args.actorUserId,
        isDeleted: false,
      }),
    );
  }

  /**
   * Call from the order pipeline when a shop receives a new order.
   */
  async recordSellerNewOrderAlert(args: {
    shopOwnerUserId: string;
    shopId: string;
    orderId: string;
    totalMinor: number;
    itemCount: number;
    actorUserId: string | null;
  }): Promise<void> {
    const dedupeKey = `seller-order:${args.orderId}`;
    const dup = await this.notifRepo.findOne({
      where: { userId: args.shopOwnerUserId, dedupeKey },
    });
    if (dup) {
      return;
    }

    const orderNumber = 'ORD-' + args.orderId.replace(/-/g, '').slice(0, 8).toUpperCase();
    const total = (args.totalMinor / 100).toFixed(2).replace(/\.00$/, '');
    const itemLabel = args.itemCount === 1 ? '1 item' : `${args.itemCount} items`;
    const title = '🛒 New Order Received!';
    const body = `${orderNumber} · ₹${total} · ${itemLabel}`;

    await this.notifRepo.save(
      this.notifRepo.create({
        userId: args.shopOwnerUserId,
        type: UserNotificationType.SELLER_NEW_ORDER,
        title,
        body,
        readAt: null,
        invitationId: null,
        dedupeKey,
        context: {
          shopId: args.shopId,
          orderId: args.orderId,
        },
        createdBy: args.actorUserId,
        updatedBy: args.actorUserId,
        isDeleted: false,
      }),
    );

    void this.fcmPush.sendToUser(
      args.shopOwnerUserId,
      { title, body },
      { screen: 'orders', orderId: args.orderId },
      { androidChannelId: 'orders' },
    );
  }

  /**
   * Monthly performance / revenue summary (idempotent per user per period key).
   */
  /**
   * Call when an order’s status changes for the buyer (placed, shipped, delivered, …).
   * Use a stable `step` per milestone so the same transition is not duplicated.
   */
  async recordCustomerOrderUpdate(args: {
    customerUserId: string;
    orderId: string;
    step: string;
    title: string;
    body?: string | null;
    actorUserId: string | null;
  }): Promise<void> {
    const dedupeKey = `cust-order:${args.orderId}:${args.step}`;
    const dup = await this.notifRepo.findOne({
      where: { userId: args.customerUserId, dedupeKey },
    });
    if (dup) {
      return;
    }
    await this.notifRepo.save(
      this.notifRepo.create({
        userId: args.customerUserId,
        type: UserNotificationType.CUSTOMER_ORDER_UPDATE,
        title: args.title.trim(),
        body: args.body?.trim() ?? null,
        readAt: null,
        invitationId: null,
        dedupeKey,
        context: { orderId: args.orderId, step: args.step },
        createdBy: args.actorUserId,
        updatedBy: args.actorUserId,
        isDeleted: false,
      }),
    );

    const body =
      args.body?.trim() || 'Open the app to see your order details.';
    void this.fcmPush.sendToUser(
      args.customerUserId,
      { title: args.title.trim(), body },
      {
        kind: 'CUSTOMER_ORDER_UPDATE',
        orderId: args.orderId,
        step: args.step,
      },
    );
  }

  async recordSellerMonthlyInsightsForUser(args: {
    userId: string;
    periodKey: string;
    monthLabel: string;
    body?: string;
  }): Promise<void> {
    const dedupeKey = `seller-insights:${args.userId}:${args.periodKey}`;
    const dup = await this.notifRepo.findOne({
      where: { userId: args.userId, dedupeKey },
    });
    if (dup) {
      return;
    }
    await this.notifRepo.save(
      this.notifRepo.create({
        userId: args.userId,
        type: UserNotificationType.SELLER_MONTHLY_INSIGHTS,
        title: `Your ${args.monthLabel} summary`,
        body:
          args.body?.trim() ??
          'Review demand activity, orders, and payouts on your dashboard.',
        readAt: null,
        invitationId: null,
        dedupeKey,
        context: { periodKey: args.periodKey },
        createdBy: null,
        updatedBy: null,
        isDeleted: false,
      }),
    );
  }

  private async maybeEmitMonthlySellerInsights(): Promise<void> {
    try {
      const now = new Date();
      if (now.getUTCDate() !== 1) {
        return;
      }
      const prev = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1),
      );
      const periodKey = `${prev.getUTCFullYear()}-${String(prev.getUTCMonth() + 1).padStart(2, '0')}`;
      const monthLabel = prev.toLocaleString('en-IN', {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      });

      const sellerIds = await this.shopsService.findUserIdsForSellerInsights();
      for (const userId of sellerIds) {
        await this.recordSellerMonthlyInsightsForUser({
          userId,
          periodKey,
          monthLabel,
        });
      }
    } catch {
      /* avoid crashing the process from background work */
    }
  }
}
