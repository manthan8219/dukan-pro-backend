import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class SyncAuthDto {
  @ApiPropertyOptional({
    description: 'Firebase ID token from the client (preferred in production).',
  })
  @IsOptional()
  @IsString()
  @MinLength(20)
  idToken?: string;

  @ApiPropertyOptional({
    description:
      'Firebase UID. Only accepted when SYNC_AUTH_DEV=true on the server (local development without service account).',
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  firebaseUid?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phoneNumber?: string;
}
