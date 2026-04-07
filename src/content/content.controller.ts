import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { User } from '../users/entities/user.entity';
import { ContentService } from './content.service';
import { RegisterUploadedContentDto } from './dto/register-uploaded-content.dto';
import { Content } from './entities/content.entity';

@ApiTags('content')
@Controller('content')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Post()
  @UseGuards(FirebaseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Register file metadata after direct upload (presign via POST /storage/presign-upload, then PUT bytes)',
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing Firebase ID token' })
  @ApiCreatedResponse({ type: Content })
  create(
    @CurrentUser() user: User,
    @Body() dto: RegisterUploadedContentDto,
  ): Promise<Content> {
    return this.contentService.registerAfterUpload(user.id, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get content metadata by id' })
  @ApiOkResponse({ type: Content })
  @ApiNotFoundResponse()
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Content> {
    return this.contentService.findOne(id);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Soft-delete content and its shop links',
  })
  @ApiNotFoundResponse()
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.contentService.remove(id);
  }
}
