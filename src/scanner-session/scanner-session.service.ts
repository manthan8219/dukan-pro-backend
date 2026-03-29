import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { SCANNER_SESSION_TTL_MS } from './scanner-session.constants';

export type ScannerClientRole = 'laptop' | 'mobile';

export type ScannerSessionRecord = {
  laptop?: string;
  mobile?: string;
  createdAt: number;
};

@Injectable()
export class ScannerSessionService implements OnModuleDestroy {
  private readonly sessions = new Map<string, ScannerSessionRecord>();
  private readonly socketToSession = new Map<
    string,
    { sessionId: string; type: ScannerClientRole }
  >();
  private purgeTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.purgeTimer = setInterval(() => this.purgeExpired(), 60_000);
  }

  onModuleDestroy(): void {
    if (this.purgeTimer) {
      clearInterval(this.purgeTimer);
      this.purgeTimer = null;
    }
  }

  createSession(): string {
    const sessionId = randomUUID();
    this.sessions.set(sessionId, { createdAt: Date.now() });
    return sessionId;
  }

  /** Returns null if missing or expired */
  getSession(sessionId: string): ScannerSessionRecord | null {
    const rec = this.sessions.get(sessionId);
    if (!rec) return null;
    if (this.isExpired(rec)) {
      this.removeSessionById(sessionId);
      return null;
    }
    return rec;
  }

  sessionExists(sessionId: string): boolean {
    return this.getSession(sessionId) !== null;
  }

  assignPeer(
    sessionId: string,
    type: ScannerClientRole,
    socketId: string,
  ): boolean {
    const rec = this.getSession(sessionId);
    if (!rec) return false;
    const prev = type === 'laptop' ? rec.laptop : rec.mobile;
    if (prev && prev !== socketId) {
      this.socketToSession.delete(prev);
    }
    if (type === 'laptop') {
      rec.laptop = socketId;
    } else {
      rec.mobile = socketId;
    }
    this.socketToSession.set(socketId, { sessionId, type });
    return true;
  }

  /**
   * Removes socket from session mapping. Returns context for notifications.
   */
  detachSocket(socketId: string): {
    sessionId: string;
    disconnectedType: ScannerClientRole;
    laptopId?: string;
    mobileId?: string;
  } | null {
    const meta = this.socketToSession.get(socketId);
    if (!meta) return null;
    this.socketToSession.delete(socketId);
    const rec = this.sessions.get(meta.sessionId);
    if (!rec) return null;
    if (meta.type === 'laptop') {
      delete rec.laptop;
    } else {
      delete rec.mobile;
    }
    const laptopId = rec.laptop;
    const mobileId = rec.mobile;
    if (!rec.laptop && !rec.mobile) {
      this.sessions.delete(meta.sessionId);
    }
    return {
      sessionId: meta.sessionId,
      disconnectedType: meta.type,
      laptopId,
      mobileId,
    };
  }

  getPeerSocketId(
    sessionId: string,
    type: ScannerClientRole,
  ): string | undefined {
    const rec = this.getSession(sessionId);
    if (!rec) return undefined;
    return type === 'laptop' ? rec.laptop : rec.mobile;
  }

  getSocketBinding(
    socketId: string,
  ): { sessionId: string; type: ScannerClientRole } | null {
    return this.socketToSession.get(socketId) ?? null;
  }

  private isExpired(rec: ScannerSessionRecord): boolean {
    return Date.now() - rec.createdAt > SCANNER_SESSION_TTL_MS;
  }

  private removeSessionById(sessionId: string): void {
    const rec = this.sessions.get(sessionId);
    if (!rec) return;
    if (rec.laptop) this.socketToSession.delete(rec.laptop);
    if (rec.mobile) this.socketToSession.delete(rec.mobile);
    this.sessions.delete(sessionId);
  }

  private purgeExpired(): void {
    const now = Date.now();
    for (const [id, rec] of this.sessions) {
      if (now - rec.createdAt > SCANNER_SESSION_TTL_MS) {
        this.removeSessionById(id);
      }
    }
  }
}
