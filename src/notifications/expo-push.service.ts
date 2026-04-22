import { Injectable, Logger } from '@nestjs/common';
import { OrderStatus } from '../orders/enums/order-status.enum';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

const STATUS_COPY: Record<OrderStatus, { title: string; body: string }> = {
  [OrderStatus.PLACED]: {
    title: 'Order Placed ✓',
    body: 'Your order has been received by the shop.',
  },
  [OrderStatus.CONFIRMED]: {
    title: 'Order Confirmed',
    body: 'The shop has accepted your order.',
  },
  [OrderStatus.PROCESSING]: {
    title: 'Being Prepared',
    body: 'Your items are being packed.',
  },
  [OrderStatus.OUT_FOR_DELIVERY]: {
    title: 'Out for Delivery 🛵',
    body: 'Your order is on its way!',
  },
  [OrderStatus.DELIVERED]: {
    title: 'Delivered! ✓',
    body: 'Your order has been delivered. Enjoy!',
  },
  [OrderStatus.CANCELLED]: {
    title: 'Order Cancelled',
    body: 'Your order was cancelled.',
  },
};

@Injectable()
export class ExpoPushService {
  private readonly logger = new Logger(ExpoPushService.name);

  /** Fire-and-forget. Never throws — errors are logged only. */
  async sendOrderStatusPush(
    expoPushToken: string,
    orderId: string,
    status: OrderStatus,
  ): Promise<void> {
    const copy = STATUS_COPY[status];
    if (!copy) return;

    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          to: expoPushToken,
          sound: 'default',
          title: copy.title,
          body: copy.body,
          data: { orderId },
        }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        this.logger.warn(
          `Expo push failed (${res.status}) for order ${orderId}: ${text}`,
        );
      }
    } catch (e) {
      this.logger.warn(
        `Expo push error for order ${orderId}: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }
}
