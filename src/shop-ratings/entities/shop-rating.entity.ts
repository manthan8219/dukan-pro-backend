import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseEntity } from '../../commons/entities/base.entity';
import { Shop } from '../../shops/entities/shop.entity';
import { User } from '../../users/entities/user.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

@Entity('shop_ratings')
@Index(['shopId'])
@Index(['ratedByUserId'])
export class ShopRating extends BaseEntity {
  @ApiProperty({ format: 'uuid' })
  @Column({ type: 'uuid' })
  shopId: string;

  @ManyToOne(() => Shop, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shopId' })
  shop: Shop;

  @ApiProperty({ minimum: 1, maximum: 5, example: 4 })
  @Column({ type: 'smallint' })
  score: number;

  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'If set, only one active rating per (shop, user) is kept (upsert)',
  })
  @Column({ type: 'uuid', nullable: true })
  ratedByUserId: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'ratedByUserId' })
  ratedByUser: User | null;

  @ApiPropertyOptional()
  @Column({ type: 'text', nullable: true })
  comment: string | null;
}
