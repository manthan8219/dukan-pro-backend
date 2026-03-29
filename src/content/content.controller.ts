import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ContentService } from './content.service';
import { CreateContentDto } from './dto/create-content.dto';
import { Content } from './entities/content.entity';

@ApiTags('content')
@Controller('content')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Post()
  @ApiOperation({
    summary: 'Register file metadata after upload (URL/key to stored object)',
  })
  @ApiCreatedResponse({ type: Content })
  create(@Body() dto: CreateContentDto): Promise<Content> {
    return this.contentService.create(dto);
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
