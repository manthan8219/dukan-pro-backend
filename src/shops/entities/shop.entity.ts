import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { Contact } from '../../commons/types/contact.types';
import type { Gst } from '../../commons/types/gst.types';
import type { Location } from '../../commons/types/location.types';
import { BaseEntity } from '../../commons/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import {
  ContactDto,
  GstDto,
  LocationDto,
  ShopOfferingDto,
} from '../dto/create-shop.dto';
import type { ShopOffering } from '../types/shop-offering.types';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

@Entity('shops')
@Index(['userId'])
export class Shop extends BaseEntity {
  @ApiProperty({ format: 'uuid' })
  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ApiProperty({ example: 'Sharma General Store' })
  @Column({ type: 'varchar', length: 200 })
  name: string;

  @ApiProperty({ example: 'Sharma Store' })
  @Column({ type: 'varchar', length: 200 })
  displayName: string;

  @ApiProperty({ example: 'Sharma Retail Pvt Ltd' })
  @Column({ type: 'varchar', length: 255 })
  billingName: string;

  @ApiProperty({ type: () => LocationDto })
  @Column({ type: 'jsonb' })
  location: Location;

  @ApiProperty({ type: () => ShopOfferingDto })
  @Column({ type: 'jsonb' })
  offering: ShopOffering;

  @ApiProperty({ type: () => ContactDto })
  @Column({ type: 'jsonb' })
  contact: Contact;

  @ApiProperty({ type: () => GstDto })
  @Column({ type: 'jsonb' })
  gst: Gst;

  @ApiPropertyOptional()
  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @ApiProperty({ default: true })
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @ApiPropertyOptional({
    description:
      'Average of all active ratings (1–5); null when there are none',
    example: 4.25,
  })
  @Column({ type: 'numeric', precision: 4, scale: 2, nullable: true })
  averageRating: string | null;

  @ApiProperty({
    description: 'Number of active rating rows for this shop',
    example: 12,
  })
  @Column({ type: 'int', default: 0 })
  ratingCount: number;
}
