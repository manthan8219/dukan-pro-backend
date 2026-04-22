import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { ExpoPushService } from '../notifications/expo-push.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ShopProduct } from '../shop-products/entities/shop-product.entity';
import { ShopsService } from '../shops/shops.service';
import { UserDeliveryAddress } from '../user-delivery-addresses/entities/user-delivery-address.entity';
import { UsersService } from '../users/users.service';
import { CustomerDemandsService } from '../customer-demands/customer-demands.service';
import { DemandInvitationsService } from '../customer-demands/demand-invitations.service';
import { ShopOrdersGateway } from '../shop-orders/shop-orders.gateway';
import { PlaceOrdersCheckoutDto } from './dto/place-orders-checkout.dto';
import { OrderItemResponseDto } from './dto/order-item-response.dto';
import { OrderResponseDto } from './dto/order-response.dto';
import { OrderItem } from './entities/order-item.entity';
import { Order } from './entities/order.entity';
import { OrderPaymentMethod } from './enums/order-payment-method.enum';
import { OrderStatus } from './enums/order-status.enum';
import {
  DEFAULT_DELIVERY_FEE_MINOR,
  FREE_DELIVERY_THRESHOLD_MINOR,
} from './orders.constants';

type PreparedLine = {
  shopProduct: ShopProduct;
  quantity: number;
  unitPriceMinor: number;
  lineTotalMinor: number;
  productNameSnapshot: string;
};

function mergeQuantitiesByShopProductId(
  items: { shopProductId: string; quantity: number }[],
): Map<string, number> {
  const merged = new Map<string, number>();
  for (const row of items) {
    merged.set(
      row.shopProductId,
      (merged.get(row.shopProductId) ?? 0) + row.quantity,
    );
  }
  return merged;
}

/** Split one checkout delivery fee across shops (minor units). */
function deliveryShareByShop(
  shopIds: string[],
  shopSubtotal: Map<string, number>,
  totalDeliveryMinor: number,
  globalSubtotal: number,
): Map<string, number> {
  const out = new Map<string, number>();
  const sorted = [...shopIds].sort();
  for (const id of sorted) {
    out.set(id, 0);
  }
  if (totalDeliveryMinor <= 0) {
    return out;
  }
  if (globalSubtotal <= 0) {
    const base = Math.floor(totalDeliveryMinor / sorted.length);
    let rem = totalDeliveryMinor - base * sorted.length;
    for (const sid of sorted) {
      const extra = rem > 0 ? 1 : 0;
      if (rem > 0) rem -= 1;
      out.set(sid, base + extra);
    }
    return out;
  }
  let assigned = 0;
  for (let i = 0; i < sorted.length; i++) {
    const sid = sorted[i]!;
    const sub = shopSubtotal.get(sid) ?? 0;
    if (i === sorted.length - 1) {
      out.set(sid, totalDeliveryMinor - assigned);
    } else {
      const share = Math.floor((totalDeliveryMinor * sub) / globalSubtotal);
      out.set(sid, share);
      assigned += share;
    }
  }
  return out;
}

@Injectable()
export class OrdersService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(ShopProduct)
    private readonly shopProductRepo: Repository<ShopProduct>,
    @InjectRepository(UserDeliveryAddress)
    private readonly addressRepo: Repository<UserDeliveryAddress>,
    private readonly usersService: UsersService,
    private readonly shopsService: ShopsService,
    private readonly notificationsService: NotificationsService,
    private readonly expoPushService: ExpoPushService,
    private readonly demandInvitationsService: DemandInvitationsService,
    private readonly customerDemandsService: CustomerDemandsService,
    private readonly shopOrdersGateway: ShopOrdersGateway,
  ) {}

  private toItemDto(row: OrderItem): OrderItemResponseDto {
    return {
      id: row.id,
      shopProductId: row.shopProductId,
      unitPriceMinor: row.unitPriceMinor,
      quantity: row.quantity,
      lineTotalMinor: row.lineTotalMinor,
      productNameSnapshot: row.productNameSnapshot,
    };
  }

  private toOrderDto(
    row: Order,
    items: OrderItem[],
    shopDisplayName?: string,
  ): OrderResponseDto {
    return {
      id: row.id,
      userId: row.userId,
      shopId: row.shopId,
      shopDisplayName,
      deliveryAddressId: row.deliveryAddressId,
      status: row.status,
      itemsSubtotalMinor: row.itemsSubtotalMinor,
      deliveryFeeMinor: row.deliveryFeeMinor,
      totalMinor: row.totalMinor,
      paymentMethod: row.paymentMethod,
      deliveredAt: row.deliveredAt ? row.deliveredAt.toISOString() : null,
      createdAt: row.createdAt.toISOString(),
      items: [...items].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()).map((i) => this.toItemDto(i)),
      sourceDemandInvitationId: row.sourceDemandInvitationId ?? null,
    };
  }

  async checkout(
    userId: string,
    dto: PlaceOrdersCheckoutDto,
  ): Promise<OrderResponseDto[]> {
    await this.usersService.findOne(userId);

    const addr = await this.addressRepo.findOne({
      where: {
        id: dto.deliveryAddressId,
        userId,
        isDeleted: false,
      },
    });
    if (!addr) {
      throw new NotFoundException('Delivery address not found for this user');
    }

    const merged = mergeQuantitiesByShopProductId(dto.items);
    const ids = [...merged.keys()];

    const paymentMethod: OrderPaymentMethod | null =
      dto.paymentMethod ?? null;

    const createdOrders: Order[] = [];

    await this.dataSource.transaction(async (manager) => {
      let closeDemandId: string | null = null;
      let expectedShopId: string | null = null;
      if (dto.demandInvitationId) {
        const r =
          await this.demandInvitationsService.assertAwardedQuotationCheckoutInTx(
            manager,
            userId,
            dto.demandInvitationId,
            merged,
          );
        closeDemandId = r.demandId;
        expectedShopId = r.expectedShopId;
      }

      const listings = await manager.getRepository(ShopProduct).find({
        where: { id: In(ids), isDeleted: false },
        relations: { shop: true, product: true },
      });
      if (listings.length !== ids.length) {
        throw new BadRequestException('One or more shop products were not found');
      }

      const byId = new Map(listings.map((s) => [s.id, s] as const));
      const preparedByShop = new Map<string, PreparedLine[]>();

      for (const [shopProductId, quantity] of merged) {
        const sp = byId.get(shopProductId)!;
        if (!sp.isListed) {
          throw new BadRequestException(
            `Product listing ${shopProductId} is not available`,
          );
        }
        if (quantity < sp.minOrderQuantity) {
          throw new BadRequestException(
            `Minimum order quantity for "${sp.product.name}" is ${sp.minOrderQuantity}`,
          );
        }
        if (quantity > sp.quantity) {
          throw new BadRequestException(
            `Not enough stock for "${sp.product.name}"`,
          );
        }
        const unitPriceMinor = sp.priceMinor;
        const lineTotalMinor = unitPriceMinor * quantity;
        const line: PreparedLine = {
          shopProduct: sp,
          quantity,
          unitPriceMinor,
          lineTotalMinor,
          productNameSnapshot: sp.product.name.slice(0, 300),
        };
        const list = preparedByShop.get(sp.shopId) ?? [];
        list.push(line);
        preparedByShop.set(sp.shopId, list);
      }

      const shopIds = [...preparedByShop.keys()].sort();
      if (expectedShopId != null) {
        if (shopIds.length !== 1 || shopIds[0] !== expectedShopId) {
          throw new BadRequestException(
            'Checkout from a quotation must include only items from that shop',
          );
        }
      }

      const shopSubtotal = new Map<string, number>();
      let globalSubtotal = 0;
      for (const sid of shopIds) {
        const sum = (preparedByShop.get(sid) ?? []).reduce(
          (s, l) => s + l.lineTotalMinor,
          0,
        );
        shopSubtotal.set(sid, sum);
        globalSubtotal += sum;
      }

      const totalDeliveryMinor =
        globalSubtotal >= FREE_DELIVERY_THRESHOLD_MINOR
          ? 0
          : DEFAULT_DELIVERY_FEE_MINOR;
      const deliveryByShop = deliveryShareByShop(
        shopIds,
        shopSubtotal,
        totalDeliveryMinor,
        globalSubtotal,
      );

      const sourceInvitationId = dto.demandInvitationId ?? null;

      for (const shopId of shopIds) {
        const lines = preparedByShop.get(shopId)!;
        const itemsSubtotalMinor = shopSubtotal.get(shopId) ?? 0;
        const deliveryFeeMinor = deliveryByShop.get(shopId) ?? 0;
        const totalMinor = itemsSubtotalMinor + deliveryFeeMinor;

        const order = manager.create(Order, {
          userId,
          shopId,
          deliveryAddressId: dto.deliveryAddressId,
          status: OrderStatus.PLACED,
          itemsSubtotalMinor,
          deliveryFeeMinor,
          totalMinor,
          paymentMethod,
          deliveredAt: null,
          sourceDemandInvitationId: sourceInvitationId,
          createdBy: userId,
          updatedBy: userId,
          isDeleted: false,
        });
        await manager.save(order);

        for (const line of lines) {
          const item = manager.create(OrderItem, {
            orderId: order.id,
            shopProductId: line.shopProduct.id,
            unitPriceMinor: line.unitPriceMinor,
            quantity: line.quantity,
            lineTotalMinor: line.lineTotalMinor,
            productNameSnapshot: line.productNameSnapshot,
            createdBy: userId,
            updatedBy: userId,
            isDeleted: false,
          });
          await manager.save(item);
        }

        for (const line of lines) {
          const res = await manager.query(
            `UPDATE shop_products SET quantity = quantity - $1, "updatedAt" = NOW() WHERE id = $2 AND quantity >= $1 AND "isDeleted" = false RETURNING id`,
            [line.quantity, line.shopProduct.id],
          );
          if (!res?.length) {
            throw new BadRequestException(
              `Could not reserve stock for "${line.productNameSnapshot}"`,
            );
          }
        }

        createdOrders.push(order);
      }

      if (closeDemandId) {
        await this.customerDemandsService.closeDemandAfterQuotationOrder(
          manager,
          userId,
          closeDemandId,
        );
      }
    });

    for (const order of createdOrders) {
      const shop = await this.shopsService.findOne(order.shopId);
      await this.notificationsService.recordSellerNewOrderAlert({
        shopOwnerUserId: shop.userId,
        shopId: order.shopId,
        orderId: order.id,
        body: `Order total ₹${(order.totalMinor / 100).toFixed(2)}`,
        actorUserId: userId,
      });
      await this.notificationsService.recordCustomerOrderUpdate({
        customerUserId: userId,
        orderId: order.id,
        step: 'placed',
        title: 'Order placed',
        body: `Your order from ${shop.displayName} was placed.`,
        actorUserId: userId,
      });
      // Fire-and-forget Expo push for PLACED
      void this.usersService.findOne(userId).then((buyer) => {
        if (buyer.expoPushToken) {
          void this.expoPushService.sendOrderStatusPush(
            buyer.expoPushToken,
            order.id,
            OrderStatus.PLACED,
          );
        }
      }).catch(() => undefined);
      this.shopOrdersGateway.emitOrderChange({
        type: 'created',
        orderId: order.id,
        shopId: order.shopId,
        buyerUserId: order.userId,
        status: order.status,
      });
    }

    const withItems = await this.orderRepo.find({
      where: { id: In(createdOrders.map((o) => o.id)) },
      relations: { items: true },
      order: { createdAt: 'DESC' },
    });
    const byOrderId = new Map(withItems.map((o) => [o.id, o] as const));

    return createdOrders.map((o) => {
      const full = byOrderId.get(o.id)!;
      return this.toOrderDto(full, full.items ?? []);
    });
  }

  async listForUser(userId: string): Promise<OrderResponseDto[]> {
    await this.usersService.findOne(userId);
    const rows = await this.orderRepo.find({
      where: { userId, isDeleted: false },
      relations: { items: true, shop: true },
      order: { createdAt: 'DESC' },
    });
    return rows.map((r) =>
      this.toOrderDto(r, r.items ?? [], r.shop?.displayName),
    );
  }

  async findOneForUser(userId: string, orderId: string): Promise<OrderResponseDto> {
    await this.usersService.findOne(userId);
    const row = await this.orderRepo.findOne({
      where: { id: orderId, userId, isDeleted: false },
      relations: { items: true, shop: true },
    });
    if (!row) {
      throw new NotFoundException('Order not found');
    }
    return this.toOrderDto(row, row.items ?? [], row.shop?.displayName);
  }

  async listForShopOwner(
    ownerUserId: string,
    shopId: string,
  ): Promise<OrderResponseDto[]> {
    await this.usersService.findOne(ownerUserId);
    const shop = await this.shopsService.findOne(shopId);
    if (shop.userId !== ownerUserId) {
      throw new ForbiddenException('You do not own this shop');
    }
    const rows = await this.orderRepo.find({
      where: { shopId, isDeleted: false },
      relations: { items: true, shop: true },
      order: { createdAt: 'DESC' },
    });
    return rows.map((r) =>
      this.toOrderDto(r, r.items ?? [], r.shop?.displayName),
    );
  }

  async updateStatusForShopOwner(
    ownerUserId: string,
    shopId: string,
    orderId: string,
    status: OrderStatus,
  ): Promise<OrderResponseDto> {
    await this.usersService.findOne(ownerUserId);
    const shop = await this.shopsService.findOne(shopId);
    if (shop.userId !== ownerUserId) {
      throw new ForbiddenException('You do not own this shop');
    }
    const row = await this.orderRepo.findOne({
      where: { id: orderId, shopId, isDeleted: false },
      relations: { items: true, shop: true },
    });
    if (!row) {
      throw new NotFoundException('Order not found');
    }
    const deliveredAt =
      status === OrderStatus.DELIVERED ? new Date() : null;
    row.status = status;
    row.deliveredAt = deliveredAt;
    row.updatedBy = ownerUserId;
    await this.orderRepo.save(row);

    await this.notificationsService.recordCustomerOrderUpdate({
      customerUserId: row.userId,
      orderId: row.id,
      step: `status:${status}`,
      title: 'Order update',
      body: `Status is now ${status.replaceAll('_', ' ')}.`,
      actorUserId: ownerUserId,
    });

    // Fire-and-forget Expo push to buyer
    void this.usersService.findOne(row.userId).then((buyer) => {
      if (buyer.expoPushToken) {
        void this.expoPushService.sendOrderStatusPush(
          buyer.expoPushToken,
          row.id,
          status,
        );
      }
    }).catch(() => undefined);

    this.shopOrdersGateway.emitOrderChange({
      type: 'updated',
      orderId: row.id,
      shopId: row.shopId,
      buyerUserId: row.userId,
      status: row.status,
    });

    return this.toOrderDto(row, row.items ?? [], row.shop?.displayName);
  }
}
