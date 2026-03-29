import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ShopsService } from '../shops/shops.service';
import { UsersService } from '../users/users.service';
import type { SellerDashboardResponseDto } from './dto/seller-dashboard-response.dto';
import { OrderItem } from './entities/order-item.entity';
import { Order } from './entities/order.entity';
import { OrderStatus } from './enums/order-status.enum';
import { LOW_STOCK_QTY_THRESHOLD } from './orders.constants';

function utcMonthStart(year: number, monthIndex0: number): Date {
  return new Date(Date.UTC(year, monthIndex0, 1, 0, 0, 0, 0));
}

function addUtcMonths(d: Date, delta: number): Date {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  return utcMonthStart(y, m + delta);
}

function formatPeriodLabel(year: number, monthIndex0: number): string {
  const label = new Date(Date.UTC(year, monthIndex0, 15)).toLocaleDateString(
    'en-IN',
    { month: 'long', year: 'numeric', timeZone: 'UTC' },
  );
  return `${label} (UTC)`;
}

function shortMonthLabel(year: number, monthIndex0: number): string {
  return new Date(Date.UTC(year, monthIndex0, 15)).toLocaleDateString('en-IN', {
    month: 'short',
    timeZone: 'UTC',
  });
}

@Injectable()
export class SellerShopDashboardService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepo: Repository<OrderItem>,
    private readonly usersService: UsersService,
    private readonly shopsService: ShopsService,
  ) {}

  async getForShopOwner(
    ownerUserId: string,
    shopId: string,
  ): Promise<SellerDashboardResponseDto> {
    await this.usersService.findOne(ownerUserId);
    const shop = await this.shopsService.findOne(shopId);
    if (shop.userId !== ownerUserId) {
      throw new ForbiddenException('You do not own this shop');
    }

    const now = new Date();
    const curY = now.getUTCFullYear();
    const curM = now.getUTCMonth();
    const monthStart = utcMonthStart(curY, curM);
    const monthEnd = addUtcMonths(monthStart, 1);

    const [
      monthAgg,
      openOrders,
      lowStockSkus,
      monthlyBuckets,
      topProducts,
      buyerSplit,
      repeatPct,
    ] = await Promise.all([
      this.aggregateOrdersInRange(shopId, monthStart, monthEnd),
      this.countOpenOrders(shopId),
      this.countLowStock(shopId),
      this.monthlyRevenueSeries(shopId, curY, curM),
      this.topProductsInRange(shopId, monthStart, monthEnd, 5),
      this.newVsReturning(shopId, monthStart, monthEnd),
      this.repeatBuyersPercent(shopId, monthStart, monthEnd),
    ]);

    const ordersMonth = monthAgg.count;
    const revenueMonthMinor = monthAgg.revenueMinor;
    const avgOrderValueMinor =
      ordersMonth > 0 ? Math.round(revenueMonthMinor / ordersMonth) : 0;

    return {
      periodLabel: formatPeriodLabel(curY, curM),
      metricsDefinition:
        'Revenue and order counts include non-cancelled orders only, bucketed by order createdAt in UTC. Open orders are all active fulfilment states. Profit and loss are not tracked yet.',
      revenueMonthMinor,
      profitMonthMinor: null,
      lossMonthMinor: null,
      ordersMonth,
      avgOrderValueMinor,
      openOrders,
      lowStockSkus,
      repeatCustomerPercent: repeatPct,
      newCustomersMonth: buyerSplit.newCustomers,
      returningCustomersMonth: buyerSplit.returningCustomers,
      monthly: monthlyBuckets,
      topProducts,
    };
  }

  private baseOrderFilter(q: ReturnType<Repository<Order>['createQueryBuilder']>) {
    return q
      .andWhere('o.isDeleted = false')
      .andWhere('o.status != :cancelled', {
        cancelled: OrderStatus.CANCELLED,
      });
  }

  private async aggregateOrdersInRange(
    shopId: string,
    start: Date,
    end: Date,
  ): Promise<{ count: number; revenueMinor: number }> {
    const row = await this.baseOrderFilter(
      this.orderRepo
        .createQueryBuilder('o')
        .select('COUNT(*)', 'cnt')
        .addSelect('COALESCE(SUM(o.totalMinor), 0)', 'rev')
        .where('o.shopId = :shopId', { shopId }),
    )
      .andWhere('o.createdAt >= :start', { start })
      .andWhere('o.createdAt < :end', { end })
      .getRawOne<{ cnt: string; rev: string }>();
    return {
      count: Number(row?.cnt ?? 0),
      revenueMinor: Number(row?.rev ?? 0),
    };
  }

  private async countOpenOrders(shopId: string): Promise<number> {
    const row = await this.orderRepo
      .createQueryBuilder('o')
      .select('COUNT(*)', 'cnt')
      .where('o.shopId = :shopId', { shopId })
      .andWhere('o.isDeleted = false')
      .andWhere('o.status NOT IN (:...done)', {
        done: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
      })
      .getRawOne<{ cnt: string }>();
    return Number(row?.cnt ?? 0);
  }

  private async countLowStock(shopId: string): Promise<number> {
    const raw = await this.orderRepo.query(
      `
      SELECT COUNT(*)::int AS c
      FROM shop_products sp
      WHERE sp."shopId" = $1
        AND sp."isDeleted" = false
        AND sp."isListed" = true
        AND sp.quantity <= $2
      `,
      [shopId, LOW_STOCK_QTY_THRESHOLD],
    );
    const row = raw[0] as { c: number } | undefined;
    return Number(row?.c ?? 0);
  }

  private async monthlyRevenueSeries(
    shopId: string,
    curY: number,
    curM: number,
  ) {
    const months: SellerDashboardResponseDto['monthly'] = [];
    const tasks: Promise<{ revenueMinor: number }>[] = [];
    for (let i = 5; i >= 0; i--) {
      const t = utcMonthStart(curY, curM - i);
      const y = t.getUTCFullYear();
      const m = t.getUTCMonth();
      const start = utcMonthStart(y, m);
      const end = addUtcMonths(start, 1);
      tasks.push(
        this.aggregateOrdersInRange(shopId, start, end).then((a) => ({
          revenueMinor: a.revenueMinor,
        })),
      );
    }
    const results = await Promise.all(tasks);
    for (let i = 5; i >= 0; i--) {
      const t = utcMonthStart(curY, curM - i);
      const y = t.getUTCFullYear();
      const m = t.getUTCMonth();
      const idx = 5 - i;
      months.push({
        month: shortMonthLabel(y, m),
        revenueMinor: results[idx]!.revenueMinor,
        profitMinor: null,
        lossMinor: null,
      });
    }
    return months;
  }

  private async topProductsInRange(
    shopId: string,
    start: Date,
    end: Date,
    limit: number,
  ): Promise<SellerDashboardResponseDto['topProducts']> {
    const rows = await this.orderItemRepo
      .createQueryBuilder('oi')
      .innerJoin('oi.order', 'o')
      .select('oi.shopProductId', 'shopProductId')
      .addSelect('MAX(oi.productNameSnapshot)', 'name')
      .addSelect('SUM(oi.quantity)', 'units')
      .addSelect('SUM(oi.lineTotalMinor)', 'revenue')
      .where('o.shopId = :shopId', { shopId })
      .andWhere('o.isDeleted = false')
      .andWhere('oi.isDeleted = false')
      .andWhere('o.status != :cancelled', {
        cancelled: OrderStatus.CANCELLED,
      })
      .andWhere('o.createdAt >= :start', { start })
      .andWhere('o.createdAt < :end', { end })
      .groupBy('oi.shopProductId')
      .orderBy('SUM(oi.lineTotalMinor)', 'DESC')
      .limit(limit)
      .getRawMany<{
        name: string;
        units: string;
        revenue: string;
      }>();

    return rows.map((r) => ({
      name: r.name,
      unitsSold: Number(r.units),
      revenueMinor: Number(r.revenue),
    }));
  }

  private async newVsReturning(
    shopId: string,
    monthStart: Date,
    monthEnd: Date,
  ): Promise<{ newCustomers: number; returningCustomers: number }> {
    const raw = await this.orderRepo.query(
      `
      WITH buyers AS (
        SELECT DISTINCT o."userId" AS "userId"
        FROM orders o
        WHERE o."shopId" = $1
          AND o."isDeleted" = false
          AND o.status::text != $2
          AND o."createdAt" >= $3
          AND o."createdAt" < $4
      )
      SELECT
        COUNT(*) FILTER (WHERE EXISTS (
          SELECT 1 FROM orders o0
          WHERE o0."shopId" = $1
            AND o0."userId" = buyers."userId"
            AND o0."isDeleted" = false
            AND o0.status::text != $2
            AND o0."createdAt" < $3
        ))::int AS returning,
        COUNT(*) FILTER (WHERE NOT EXISTS (
          SELECT 1 FROM orders o0
          WHERE o0."shopId" = $1
            AND o0."userId" = buyers."userId"
            AND o0."isDeleted" = false
            AND o0.status::text != $2
            AND o0."createdAt" < $3
        ))::int AS new_customers
      FROM buyers
      `,
      [shopId, OrderStatus.CANCELLED, monthStart, monthEnd],
    );

    const row = raw[0] as
      | { returning: number; new_customers: number }
      | undefined;
    return {
      returningCustomers: Number(row?.returning ?? 0),
      newCustomers: Number(row?.new_customers ?? 0),
    };
  }

  private async repeatBuyersPercent(
    shopId: string,
    monthStart: Date,
    monthEnd: Date,
  ): Promise<number> {
    const rows = await this.orderRepo
      .createQueryBuilder('o')
      .select('o.userId', 'userId')
      .addSelect('COUNT(*)', 'c')
      .where('o.shopId = :shopId', { shopId })
      .andWhere('o.isDeleted = false')
      .andWhere('o.status != :cancelled', {
        cancelled: OrderStatus.CANCELLED,
      })
      .andWhere('o.createdAt >= :start', { start: monthStart })
      .andWhere('o.createdAt < :end', { end: monthEnd })
      .groupBy('o.userId')
      .getRawMany<{ userId: string; c: string }>();

    if (rows.length === 0) {
      return 0;
    }
    const multi = rows.filter((r) => Number(r.c) >= 2).length;
    return Math.round((100 * multi) / rows.length);
  }
}
