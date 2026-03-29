import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../commons/entities/base.entity';
import { Content } from '../../content/entities/content.entity';
import { Shop } from '../../shops/entities/shop.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';

/**
 * Bridge: one content file can be attached to a shop with a display order.
 * Same Content row could later be linked to orders, etc. via other bridges.
 */
@Entity('shop_content_links')
@Index(['shopId', 'sortOrder'])
@Unique(['shopId', 'contentId'])
export class ShopContentLink extends BaseEntity {
  @ApiProperty({ format: 'uuid' })
  @Column({ type: 'uuid' })
  shopId: string;

  @ManyToOne(() => Shop, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shopId' })
  shop: Shop;

  @ApiProperty({ format: 'uuid' })
  @Column({ type: 'uuid' })
  contentId: string;

  @ManyToOne(() => Content, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contentId' })
  content: Content;

  @ApiProperty({
    description: 'Lower sorts first (0 = first image in gallery)',
    example: 0,
  })
  @Column({ type: 'int' })
  sortOrder: number;
}
