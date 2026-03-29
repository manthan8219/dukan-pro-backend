import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/enums/user-role.enum';
import { UsersService } from '../users/users.service';
import { ShopsService } from '../shops/shops.service';
import type { SyncAuthDto } from './dto/sync-auth.dto';
import { AuthSessionResponseDto } from './dto/auth-session-response.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly config: ConfigService,
    private readonly usersService: UsersService,
    private readonly shopsService: ShopsService,
  ) {}

  async sync(dto: SyncAuthDto): Promise<AuthSessionResponseDto> {
    const devTrust = this.config.get<string>('SYNC_AUTH_DEV') === 'true';

    if (dto.idToken) {
      await this.ensureFirebaseAdmin();
      let decoded: admin.auth.DecodedIdToken;
      try {
        decoded = await admin.auth().verifyIdToken(dto.idToken);
      } catch {
        throw new UnauthorizedException('Invalid or expired id token.');
      }
      let user = await this.usersService.upsertFromFirebase({
        uid: decoded.uid,
        email: decoded.email ?? dto.email,
        displayName: decoded.name ?? dto.displayName,
        phoneNumber: decoded.phone_number ?? dto.phoneNumber,
      });
      user = await this.reconcileSellerStateFromShops(user);
      return this.toSession(user);
    }

    if (devTrust && dto.firebaseUid) {
      let user = await this.usersService.upsertFromFirebase({
        uid: dto.firebaseUid,
        email: dto.email,
        displayName: dto.displayName,
        phoneNumber: dto.phoneNumber,
      });
      user = await this.reconcileSellerStateFromShops(user);
      return this.toSession(user);
    }

    throw new UnauthorizedException(
      devTrust
        ? 'Send idToken, or firebaseUid when SYNC_AUTH_DEV is enabled.'
        : 'Send a valid Firebase idToken (set FIREBASE_SERVICE_ACCOUNT_JSON on the server, or SYNC_AUTH_DEV=true for local UID-only sync).',
    );
  }

  private toSession(user: User): AuthSessionResponseDto {
    return {
      id: user.id,
      role: user.role,
      sellerOnboardingComplete: user.sellerOnboardingComplete,
    };
  }

  /** If the user already owns shops, treat seller onboarding as done (covers legacy rows). */
  private async reconcileSellerStateFromShops(user: User): Promise<User> {
    const shops = await this.shopsService.findByUserId(user.id);
    if (shops.length === 0) {
      return user;
    }
    if (user.sellerOnboardingComplete && user.role === UserRole.SELLER) {
      return user;
    }
    return this.usersService.update(user.id, {
      role: UserRole.SELLER,
      sellerOnboardingComplete: true,
    });
  }

  private ensureFirebaseAdmin(): void {
    if (admin.apps.length > 0) {
      return;
    }
    const raw = this.config.get<string>('FIREBASE_SERVICE_ACCOUNT_JSON');
    if (!raw?.trim()) {
      throw new UnauthorizedException(
        'Server is not configured to verify Firebase tokens (set FIREBASE_SERVICE_ACCOUNT_JSON).',
      );
    }
    try {
      const cred = JSON.parse(raw) as admin.ServiceAccount;
      admin.initializeApp({ credential: admin.credential.cert(cred) });
    } catch {
      throw new UnauthorizedException('Invalid FIREBASE_SERVICE_ACCOUNT_JSON.');
    }
  }
}
