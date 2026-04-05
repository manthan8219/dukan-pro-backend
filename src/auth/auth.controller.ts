import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { AuthSessionResponseDto } from './dto/auth-session-response.dto';
import { SyncAuthDto } from './dto/sync-auth.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('sync')
  @ApiOperation({
    summary: 'Upsert user from Firebase and return app session fields',
    description:
      'Call after Firebase sign-in. Send `idToken` from `user.getIdToken()` in production. For local dev without a service account, set SYNC_AUTH_DEV=true and send `firebaseUid` (+ optional email/displayName).',
  })
  @ApiOkResponse({ type: AuthSessionResponseDto })
  @ApiUnauthorizedResponse({
    description: 'Missing/invalid token or misconfigured server',
  })
  sync(@Body() dto: SyncAuthDto): Promise<AuthSessionResponseDto> {
    return this.authService.sync(dto);
  }

  @Post('create-seller')
  @ApiOperation({
    summary: 'Upsert user from Firebase and ensure SELLER role',
    description:
      'Same body and rules as `POST /auth/sync`. After upserting the user, assigns the SELLER role if missing (idempotent on repeat calls).',
  })
  @ApiOkResponse({ type: AuthSessionResponseDto })
  @ApiUnauthorizedResponse({
    description: 'Missing/invalid token or misconfigured server',
  })
  createSeller(@Body() dto: SyncAuthDto): Promise<AuthSessionResponseDto> {
    return this.authService.createSeller(dto);
  }

  @Post('create-customer')
  @ApiOperation({
    summary: 'Upsert user from Firebase and ensure CUSTOMER role',
    description:
      'Same body and rules as `POST /auth/sync`. After upserting the user, assigns the CUSTOMER role if missing (idempotent on repeat calls).',
  })
  @ApiOkResponse({ type: AuthSessionResponseDto })
  @ApiUnauthorizedResponse({
    description: 'Missing/invalid token or misconfigured server',
  })
  createCustomer(@Body() dto: SyncAuthDto): Promise<AuthSessionResponseDto> {
    return this.authService.createCustomer(dto);
  }
}
