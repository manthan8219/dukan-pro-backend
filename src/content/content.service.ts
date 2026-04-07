import {
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ShopContentService } from '../shop-content/shop-content.service';
import { RegisterUploadedContentDto } from './dto/register-uploaded-content.dto';
import { Content } from './entities/content.entity';

@Injectable()
export class ContentService {
  constructor(
    @InjectRepository(Content)
    private readonly contentRepository: Repository<Content>,
    @Inject(forwardRef(() => ShopContentService))
    private readonly shopContentService: ShopContentService,
  ) {}

  async registerAfterUpload(
    ownerUserId: string,
    dto: RegisterUploadedContentDto,
  ): Promise<Content> {
    const row = this.contentRepository.create({
      storageUrl: dto.storageUrl,
      kind: dto.kind,
      mimeType: dto.mimeType ?? null,
      originalFileName: dto.originalFileName ?? null,
      byteSize: dto.byteSize ?? null,
      ownerUserId,
      metadata: dto.metadata ?? null,
    });
    return this.contentRepository.save(row);
  }

  async findOne(id: string): Promise<Content> {
    const row = await this.contentRepository.findOne({
      where: { id, isDeleted: false },
    });
    if (!row) {
      throw new NotFoundException(`Content ${id} not found`);
    }
    return row;
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.shopContentService.softDeleteLinksForContent(id);
    await this.contentRepository.update({ id }, { isDeleted: true });
  }
}
