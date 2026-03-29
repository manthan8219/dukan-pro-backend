import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ContentService } from '../content/content.service';
import { ShopsService } from '../shops/shops.service';
import { AttachShopContentDto } from './dto/attach-shop-content.dto';
import { ReorderShopContentDto } from './dto/reorder-shop-content.dto';
import { ShopContentLink } from './entities/shop-content-link.entity';

@Injectable()
export class ShopContentService {
  constructor(
    @InjectRepository(ShopContentLink)
    private readonly linkRepository: Repository<ShopContentLink>,
    private readonly contentService: ContentService,
    private readonly shopsService: ShopsService,
    private readonly dataSource: DataSource,
  ) {}

  async attach(
    shopId: string,
    dto: AttachShopContentDto,
  ): Promise<ShopContentLink> {
    await this.shopsService.findOne(shopId);
    await this.contentService.findOne(dto.contentId);

    const duplicate = await this.linkRepository.findOne({
      where: { shopId, contentId: dto.contentId, isDeleted: false },
    });
    if (duplicate) {
      throw new ConflictException('This file is already linked to this shop');
    }

    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(ShopContentLink);
      let sortOrder = dto.sortOrder;
      if (sortOrder === undefined) {
        const raw = await repo
          .createQueryBuilder('l')
          .select('COALESCE(MAX(l.sortOrder), -1)', 'max')
          .where('l.shopId = :shopId', { shopId })
          .andWhere('l.isDeleted = false')
          .getRawOne<{ max: string }>();
        sortOrder = Number(raw?.max ?? -1) + 1;
      } else {
        await repo
          .createQueryBuilder()
          .update(ShopContentLink)
          .set({ sortOrder: () => '"sortOrder" + 1' })
          .where('shopId = :shopId', { shopId })
          .andWhere('isDeleted = false')
          .andWhere('sortOrder >= :sortOrder', { sortOrder })
          .execute();
      }

      const link = repo.create({
        shopId,
        contentId: dto.contentId,
        sortOrder,
      });
      return repo.save(link);
    });
  }

  async listByShop(shopId: string): Promise<ShopContentLink[]> {
    await this.shopsService.findOne(shopId);
    return this.linkRepository.find({
      where: { shopId, isDeleted: false },
      relations: ['content'],
      order: { sortOrder: 'ASC' },
    });
  }

  async detach(shopId: string, linkId: string): Promise<void> {
    await this.shopsService.findOne(shopId);
    const link = await this.linkRepository.findOne({
      where: { id: linkId, shopId, isDeleted: false },
    });
    if (!link) {
      throw new NotFoundException('Shop content link not found');
    }
    link.isDeleted = true;
    await this.linkRepository.save(link);
  }

  async reorder(
    shopId: string,
    dto: ReorderShopContentDto,
  ): Promise<ShopContentLink[]> {
    await this.shopsService.findOne(shopId);
    const active = await this.linkRepository.find({
      where: { shopId, isDeleted: false },
      order: { sortOrder: 'ASC' },
    });
    const activeIds = new Set(active.map((l) => l.id));
    const ordered = dto.orderedLinkIds;
    if (active.length === 0) {
      if (ordered.length > 0) {
        throw new BadRequestException(
          'This shop has no content links to reorder',
        );
      }
      return [];
    }
    if (ordered.length !== active.length) {
      throw new BadRequestException(
        'orderedLinkIds must list every active content link for this shop exactly once',
      );
    }
    for (const id of ordered) {
      if (!activeIds.has(id)) {
        throw new BadRequestException(`Unknown or inactive link id: ${id}`);
      }
    }

    await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(ShopContentLink);
      for (let i = 0; i < ordered.length; i++) {
        await repo.update({ id: ordered[i] }, { sortOrder: i });
      }
    });

    return this.listByShop(shopId);
  }

  /** Used when deleting content: soft-delete all shop links pointing at this file. */
  async softDeleteLinksForContent(contentId: string): Promise<void> {
    await this.linkRepository.update(
      { contentId, isDeleted: false },
      { isDeleted: true },
    );
  }
}
