import {
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Razorpay from 'razorpay';

@Injectable()
export class RazorpayClientService {
  private instance: Razorpay | null = null;

  constructor(private readonly config: ConfigService) {}

  assertConfigured(): Razorpay {
    if (this.instance) {
      return this.instance;
    }
    const key_id = this.config.get<string>('RAZORPAY_KEY_ID')?.trim();
    const key_secret = this.config.get<string>('RAZORPAY_KEY_SECRET')?.trim();
    if (!key_id || !key_secret) {
      throw new ServiceUnavailableException(
        'Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET on the server.',
      );
    }
    this.instance = new Razorpay({ key_id, key_secret });
    return this.instance;
  }

  async createOrder(amountMinor: number, receipt: string): Promise<{ id: string }> {
    const rzp = this.assertConfigured();
    const safeReceipt = receipt.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40);
    const order = (await rzp.orders.create({
      amount: amountMinor,
      currency: 'INR',
      receipt: safeReceipt || `rcp_${Date.now()}`,
    })) as { id: string };
    return { id: order.id };
  }

  /** Confirms amount, order binding, and capture status with Razorpay servers. */
  async fetchPayment(paymentId: string): Promise<{
    id: string;
    amount: number;
    currency: string;
    status: string;
    order_id?: string | null;
  }> {
    const rzp = this.assertConfigured();
    const p = (await rzp.payments.fetch(paymentId)) as {
      id: string;
      amount: number;
      currency: string;
      status: string;
      order_id?: string | null;
    };
    return p;
  }
}
