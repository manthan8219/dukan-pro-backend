import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { PresignUploadDto } from './dto/presign-upload.dto';
import { StorageService, type PresignPutResult } from './storage.service';

@ApiTags('storage')
@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Get('status')
  @ApiOperation({ summary: 'Whether server-side Supabase S3 upload is configured' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: { uploadsEnabled: { type: 'boolean' } },
    },
  })
  status(): { uploadsEnabled: boolean } {
    return { uploadsEnabled: this.storageService.isConfigured() };
  }

  @Post('presign-upload')
  @UseGuards(FirebaseAuthGuard)
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'Invalid or missing Firebase ID token' })
  @ApiOperation({
    summary:
      'Presign a PUT to Supabase Storage (S3). Use returned URL from the app, PUT bytes, then POST /content with storageUrl.',
  })
  @ApiCreatedResponse({
    description: 'PUT target and the storageUrl to save on the content row',
  })
  presignUpload(@Body() dto: PresignUploadDto): Promise<PresignPutResult> {
    return this.storageService.presignPut({
      visibility: dto.visibility,
      fileName: dto.fileName,
      contentType: dto.contentType,
    });
  }
}
