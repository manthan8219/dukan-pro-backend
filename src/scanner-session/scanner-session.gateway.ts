import { Logger } from '@nestjs/common';
import {
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import {
  WS_EVENT_JOIN_SESSION,
  WS_EVENT_SCAN,
  WS_EVENT_SESSION_READY,
  WS_EVENT_SCAN_RECEIVED,
  WS_EVENT_SCANNER_STATUS,
  WS_EVENT_SESSION_ERROR,
} from './scanner-session.constants';
import {
  ScannerClientRole,
  ScannerSessionService,
} from './scanner-session.service';
import { resolveFrontendOrigins } from '../config/frontend-origins';

export type JoinSessionPayload = {
  sessionId: string;
  type: ScannerClientRole;
};

export type ScanPayload = {
  sessionId: string;
  barcode: string;
};

@WebSocketGateway({
  cors: {
    origin: resolveFrontendOrigins(),
    credentials: true,
  },
})
export class ScannerSessionGateway implements OnGatewayDisconnect {
  private readonly logger = new Logger(ScannerSessionGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(private readonly scannerSession: ScannerSessionService) {}

  handleDisconnect(client: Socket): void {
    const ctx = this.scannerSession.detachSocket(client.id);
    if (!ctx) return;
    if (ctx.disconnectedType === 'mobile' && ctx.laptopId) {
      this.server
        .to(ctx.laptopId)
        .emit(WS_EVENT_SCANNER_STATUS, { connected: false });
    }
  }

  @SubscribeMessage(WS_EVENT_JOIN_SESSION)
  handleJoinSession(client: Socket, payload: JoinSessionPayload): void {
    const sessionId =
      typeof payload?.sessionId === 'string' ? payload.sessionId.trim() : '';
    const type = payload?.type;
    if (!sessionId || (type !== 'laptop' && type !== 'mobile')) {
      client.emit(WS_EVENT_SESSION_ERROR, { message: 'Invalid join payload' });
      return;
    }
    if (!this.scannerSession.sessionExists(sessionId)) {
      client.emit(WS_EVENT_SESSION_ERROR, {
        message: 'Session not found or expired',
      });
      return;
    }
    const ok = this.scannerSession.assignPeer(sessionId, type, client.id);
    if (!ok) {
      client.emit(WS_EVENT_SESSION_ERROR, {
        message: 'Session not found or expired',
      });
      return;
    }
    client.emit(WS_EVENT_SESSION_READY, { sessionId, type });
    if (type === 'laptop') {
      const hasMobile = Boolean(
        this.scannerSession.getPeerSocketId(sessionId, 'mobile'),
      );
      client.emit(WS_EVENT_SCANNER_STATUS, { connected: hasMobile });
    } else {
      const laptopId = this.scannerSession.getPeerSocketId(
        sessionId,
        'laptop',
      );
      if (laptopId) {
        this.server
          .to(laptopId)
          .emit(WS_EVENT_SCANNER_STATUS, { connected: true });
      }
    }
  }

  @SubscribeMessage(WS_EVENT_SCAN)
  handleScan(client: Socket, payload: ScanPayload): void {
    const sessionId =
      typeof payload?.sessionId === 'string' ? payload.sessionId.trim() : '';
    const barcode =
      typeof payload?.barcode === 'string' ? payload.barcode.trim() : '';
    if (!sessionId || !barcode) {
      return;
    }
    const ctx = this.scannerSession.getSocketBinding(client.id);
    if (!ctx || ctx.type !== 'mobile' || ctx.sessionId !== sessionId) {
      this.logger.debug(`Ignored scan from socket ${client.id}`);
      return;
    }
    if (!this.scannerSession.sessionExists(sessionId)) {
      client.emit(WS_EVENT_SESSION_ERROR, {
        message: 'Session not found or expired',
      });
      return;
    }
    const laptopId = this.scannerSession.getPeerSocketId(sessionId, 'laptop');
    if (laptopId) {
      this.server.to(laptopId).emit(WS_EVENT_SCAN, { sessionId, barcode });
    }
    client.emit(WS_EVENT_SCAN_RECEIVED, { barcode });
  }
}
