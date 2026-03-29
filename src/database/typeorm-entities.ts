import { Content } from '../content/entities/content.entity';
import { CustomerDemandAudit } from '../customer-demands/entities/customer-demand-audit.entity';
import { CustomerDemand } from '../customer-demands/entities/customer-demand.entity';
import { DemandShopInvitation } from '../customer-demands/entities/demand-shop-invitation.entity';
import { UserNotification } from '../notifications/entities/user-notification.entity';
import { Product } from '../products/entities/product.entity';
import { SellerProfile } from '../seller-profile/entities/seller-profile.entity';
import { ShopContentLink } from '../shop-content/entities/shop-content-link.entity';
import { ShopDeliveryRadiusRule } from '../shop-delivery-radius-rules/entities/shop-delivery-radius-rule.entity';
import { ShopProduct } from '../shop-products/entities/shop-product.entity';
import { ShopRating } from '../shop-ratings/entities/shop-rating.entity';
import { Shop } from '../shops/entities/shop.entity';
import { User } from '../users/entities/user.entity';
import { UserDeliveryAddress } from '../user-delivery-addresses/entities/user-delivery-address.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { Order } from '../orders/entities/order.entity';

/** Single list used by Nest TypeORM and the migration CLI (`data-source.ts`). */
export const typeOrmEntities = [
  User,
  UserDeliveryAddress,
  Shop,
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
];
