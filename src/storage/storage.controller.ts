import { Body, Controller, Get, Post } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
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
  @ApiOperation({
    summary:
      'Presign a PUT to Supabase Storage (S3). Use returned URL from the browser, then register content with storageUrl.',
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
