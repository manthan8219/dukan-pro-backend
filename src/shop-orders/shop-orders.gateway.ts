import { Logger } from '@nestjs/common';
import {
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AuthService } from '../auth/auth.service';
import { ShopsService } from '../shops/shops.service';
import { OrderStatus } from '../orders/enums/order-status.enum';
import {
  WS_CLIENT_JOIN_BUYER,
  WS_CLIENT_JOIN_SHOP,
  WS_SERVER_JOINED_BUYER,
  WS_SERVER_JOINED_SHOP,
  WS_SERVER_JOIN_ERROR,
  WS_SHOP_ORDER_EVENT,
} from './shop-orders.constants';

export type ShopOrderRealtimePayload = {
  type: 'created' | 'updated';
  orderId: string;
  shopId: string;
  buyerUserId: string;
  status: OrderStatus;
};

@WebSocketGateway({
  namespace: '/shop-orders',
  cors: { origin: true, credentials: true },
})
export class ShopOrdersGateway implements OnGatewayInit {
  private readonly logger = new Logger(ShopOrdersGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly authService: AuthService,
    private readonly shopsService: ShopsService,
  ) {}

  afterInit(server: Server): void {
    server.use(async (socket, next) => {
      try {
        const raw = socket.handshake.auth;
        const token =
          typeof raw?.token === 'string'
            ? raw.token.trim()
            : typeof raw?.idToken === 'string'
              ? raw.idToken.trim()
              : '';
        if (!token) {
          next(new Error('Unauthorized'));
          return;
        }
        const user = await this.authService.resolveUserFromBearer(
          `Bearer ${token}`,
        );
        socket.data.userId = user.id;
        next();
      } catch (e) {
        this.logger.debug(`WS auth failed: ${e instanceof Error ? e.message : e}`);
        next(new Error('Unauthorized'));
      }
    });
  }

  emitOrderChange(payload: ShopOrderRealtimePayload): void {
    this.server.to(`shop:${payload.shopId}`).emit(WS_SHOP_ORDER_EVENT, payload);
    this.server
      .to(`buyer:${payload.buyerUserId}`)
      .emit(WS_SHOP_ORDER_EVENT, payload);
  }

  @SubscribeMessage(WS_CLIENT_JOIN_SHOP)
  async handleJoinShop(
    client: Socket,
    body: { shopId?: string },
  ): Promise<void> {
    const userId = client.data.userId as string | undefined;
    const shopId =
      typeof body?.shopId === 'string' ? body.shopId.trim() : '';
    if (!userId || !shopId) {
      client.emit(WS_SERVER_JOIN_ERROR, { message: 'Invalid shopId' });
      return;
    }
    try {
      const shop = await this.shopsService.findOne(shopId);
      if (shop.userId !== userId) {
        client.emit(WS_SERVER_JOIN_ERROR, { message: 'Forbidden' });
        return;
      }
      await client.join(`shop:${shopId}`);
      client.emit(WS_SERVER_JOINED_SHOP, { shopId });
    } catch {
      client.emit(WS_SERVER_JOIN_ERROR, { message: 'Shop not found' });
    }
  }

  @SubscribeMessage(WS_CLIENT_JOIN_BUYER)
  async handleJoinBuyer(client: Socket): Promise<void> {
    const userId = client.data.userId as string | undefined;
    if (!userId) {
      client.emit(WS_SERVER_JOIN_ERROR, { message: 'Unauthorized' });
      return;
    }
    await client.join(`buyer:${userId}`);
    client.emit(WS_SERVER_JOINED_BUYER, { userId });
  }
}
