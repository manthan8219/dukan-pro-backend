import { Content } from '../content/entities/content.entity';
import { CustomerDemandAudit } from '../customer-demands/entities/customer-demand-audit.entity';
import { CustomerDemand } from '../customer-demands/entities/customer-demand.entity';
import { DemandShopInvitation } from '../customer-demands/entities/demand-shop-invitation.entity';
import { KhataEntry } from '../khata/entities/khata-entry.entity';
import { ShopCustomer } from '../khata/entities/shop-customer.entity';
import { UserNotification } from '../notifications/entities/user-notification.entity';
import { Product } from '../products/entities/product.entity';
import { SellerProfile } from '../seller-profile/entities/seller-profile.entity';
import { ShopContentLink } from '../shop-content/entities/shop-content-link.entity';
import { ShopDeliveryRadiusRule } from '../shop-delivery-radius-rules/entities/shop-delivery-radius-rule.entity';
import { ShopProduct } from '../shop-products/entities/shop-product.entity';
import { ShopRating } from '../shop-ratings/entities/shop-rating.entity';
import { ShopDeliveryFeeRule } from '../shops/entities/shop-delivery-fee-rule.entity';
import { ShopDeliverySlot } from '../shops/entities/shop-delivery-slot.entity';
import { ShopOpeningHour } from '../shops/entities/shop-opening-hour.entity';
import { Shop } from '../shops/entities/shop.entity';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../user-roles/entities/user-role.entity';
import { UserDeliveryAddress } from '../user-delivery-addresses/entities/user-delivery-address.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { Order } from '../orders/entities/order.entity';
import { ShopSubscription } from '../subscriptions/entities/shop-subscription.entity';
import { SubscriptionPlan } from '../subscriptions/entities/subscription-plan.entity';

/** Single list used by Nest TypeORM and the migration CLI (`data-source.ts`). */
export const typeOrmEntities = [
  User,
  UserRole,
  UserDeliveryAddress,
  Shop,
  ShopDeliveryFeeRule,
  ShopDeliverySlot,
  ShopOpeningHour,
  SellerProfile,
  Product,
  ShopProduct,
  Content,
  ShopContentLink,
  ShopRating,
  ShopDeliveryRadiusRule,
  UserNotification,
  CustomerDemand,
  DemandShopInvitation,
  CustomerDemandAudit,
  Order,
  OrderItem,
  SubscriptionPlan,
  ShopSubscription,
  ShopCustomer,
  KhataEntry,
];
