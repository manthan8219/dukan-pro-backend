import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { UserRolesService } from '../user-roles/user-roles.service';
import { UserRoleKind } from '../user-roles/enums/user-role-kind.enum';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import type { SyncAuthDto } from './dto/sync-auth.dto';
import { AuthSessionResponseDto } from './dto/auth-session-response.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly config: ConfigService,
    private readonly usersService: UsersService,
    private readonly userRolesService: UserRolesService,
  ) {}

  async sync(dto: SyncAuthDto): Promise<AuthSessionResponseDto> {
    const user = await this.upsertUserFromSyncDto(dto);
    return this.toSession(user);
  }

  async createSeller(dto: SyncAuthDto): Promise<AuthSessionResponseDto> {
    const user = await this.upsertUserFromSyncDto(dto);
    await this.userRolesService.ensureRole(user.id, UserRoleKind.SELLER);
    return this.toSession(user);
  }

  async createCustomer(dto: SyncAuthDto): Promise<AuthSessionResponseDto> {
    const user = await this.upsertUserFromSyncDto(dto);
    await this.userRolesService.ensureRole(user.id, UserRoleKind.CUSTOMER);
    return this.toSession(user);
  }

  private async upsertUserFromSyncDto(dto: SyncAuthDto): Promise<User> {
    const devTrust = this.config.get<string>('SYNC_AUTH_DEV') === 'true';

    if (dto.idToken) {
      await this.ensureFirebaseAdmin();
      let decoded: admin.auth.DecodedIdToken;
      try {
        decoded = await admin.auth().verifyIdToken(dto.idToken);
      } catch {
        throw new UnauthorizedException('Invalid or expired id token.');
      }
      return this.usersService.upsertFromFirebase({
        uid: decoded.uid,
        email: decoded.email ?? dto.email,
        displayName: decoded.name ?? dto.displayName,
        phoneNumber: decoded.phone_number ?? dto.phoneNumber,
      });
    }

    if (devTrust && dto.firebaseUid) {
      return this.usersService.upsertFromFirebase({
        uid: dto.firebaseUid,
        email: dto.email,
        displayName: dto.displayName,
        phoneNumber: dto.phoneNumber,
      });
    }

    throw new UnauthorizedException(
      devTrust
        ? 'Send idToken, or firebaseUid when SYNC_AUTH_DEV is enabled.'
        : 'Send a valid Firebase idToken (set FIREBASE_SERVICE_ACCOUNT_JSON on the server, or SYNC_AUTH_DEV=true for local UID-only sync).',
    );
  }

  /**
   * Authorize `Authorization: Bearer <token>` where token is a Firebase ID token (JWT),
   * or when SYNC_AUTH_DEV=true, a raw Firebase UID (non-JWT).
   */
  async resolveUserFromBearer(
    authorizationHeader: string | undefined,
  ): Promise<User> {
    if (!authorizationHeader?.toLowerCase().startsWith('bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header.');
    }
    const token = authorizationHeader.slice(7).trim();
    if (!token) {
      throw new UnauthorizedException('Missing bearer token.');
    }

    const devTrust = this.config.get<string>('SYNC_AUTH_DEV') === 'true';
    const looksLikeJwt = token.split('.').length === 3;

    if (!looksLikeJwt) {
      if (devTrust) {
        return this.usersService.upsertFromFirebase({
          uid: token,
          email: undefined,
          displayName: undefined,
          phoneNumber: undefined,
        });
      }
      throw new UnauthorizedException(
        'Expected a Firebase ID token. With SYNC_AUTH_DEV=true you may send the Firebase UID as the bearer value.',
      );
    }

    await this.ensureFirebaseAdmin();
    let decoded: admin.auth.DecodedIdToken;
    try {
      decoded = await admin.auth().verifyIdToken(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired id token.');
    }
    return this.usersService.upsertFromFirebase({
      uid: decoded.uid,
      email: decoded.email ?? undefined,
      displayName: decoded.name ?? undefined,
      phoneNumber: decoded.phone_number ?? undefined,
    });
  }

  private toSession(user: User): AuthSessionResponseDto {
    return {
      id: user.id,
    };
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
