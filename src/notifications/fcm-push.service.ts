import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as admin from 'firebase-admin';
import { Repository } from 'typeorm';
import { UserFcmToken } from './entities/user-fcm-token.entity';

@Injectable()
export class FcmPushService {
  private readonly logger = new Logger(FcmPushService.name);

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(UserFcmToken)
    private readonly tokenRepo: Repository<UserFcmToken>,
  ) {}

  private ensureFirebaseApp(): boolean {
    if (admin.apps.length > 0) {
      return true;
    }
    const raw = this.config.get<string>('FIREBASE_SERVICE_ACCOUNT_JSON');
    if (!raw?.trim()) {
      return false;
    }
    try {
      const cred = JSON.parse(raw) as admin.ServiceAccount;
      admin.initializeApp({ credential: admin.credential.cert(cred) });
      return true;
    } catch {
      return false;
    }
  }

  async registerToken(
    userId: string,
    token: string,
    platform?: string,
  ): Promise<void> {
    const trimmed = token.trim();
    const existing = await this.tokenRepo.findOne({
      where: { token: trimmed, isDeleted: false },
    });
    if (existing) {
      existing.userId = userId;
      existing.platform = platform?.trim() || null;
      existing.updatedBy = userId;
      await this.tokenRepo.save(existing);
      return;
    }
    await this.tokenRepo.save(
      this.tokenRepo.create({
        userId,
        token: trimmed,
        platform: platform?.trim() || null,
        createdBy: userId,
        updatedBy: userId,
        isDeleted: false,
      }),
    );
  }

  private async tokensForUser(userId: string): Promise<string[]> {
    const rows = await this.tokenRepo.find({
      where: { userId, isDeleted: false },
      select: ['token'],
    });
    return rows.map((r) => r.token);
  }

  /**
   * Best-effort FCM multicast. Invalid tokens are logged and ignored.
   */
  async sendToUser(
    userId: string,
    notification: { title: string; body: string },
    data: Record<string, string>,
    opts?: { androidChannelId?: string },
  ): Promise<void> {
    if (!this.ensureFirebaseApp()) {
      return;
    }
    const tokens = await this.tokensForUser(userId);
    if (!tokens.length) {
      return;
    }
    try {
      const res = await admin.messaging().sendEachForMulticast({
        tokens,
        notification,
        data,
        android: {
          priority: 'high',
          notification: {
            channelId: opts?.androidChannelId ?? 'default',
            sound: 'default',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              contentAvailable: true,
            },
          },
        },
      });
      if (res.failureCount > 0) {
        const staleErrorCodes = new Set([
          'messaging/registration-token-not-registered',
          'messaging/invalid-registration-token',
        ]);
        for (let i = 0; i < res.responses.length; i++) {
          const r = res.responses[i]!;
          if (!r.success && staleErrorCodes.has(r.error?.code ?? '')) {
            const t = tokens[i];
            if (t) {
              await this.tokenRepo.update(
                { token: t },
                { isDeleted: true, updatedBy: userId },
              );
            }
          }
        }
      }
    } catch (e) {
      this.logger.warn(
        `FCM send failed: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }
}
