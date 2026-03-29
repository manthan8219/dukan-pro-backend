import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../commons/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { DeliveryAddressTag } from '../enums/delivery-address-tag.enum';

@Entity('user_delivery_addresses')
@Index(['userId'])
export class UserDeliveryAddress extends BaseEntity {
  @ApiProperty({ format: 'uuid' })
  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ApiProperty({ maxLength: 120 })
  @Column({ type: 'varchar', length: 120 })
  fullName: string;

  @ApiProperty({ maxLength: 32 })
  @Column({ type: 'varchar', length: 32 })
  phone: string;

  @ApiProperty({ maxLength: 500 })
  @Column({ type: 'varchar', length: 500 })
  line1: string;

  @ApiProperty({ maxLength: 500 })
  @Column({ type: 'varchar', length: 500, default: '' })
  line2: string;

  @ApiProperty({ maxLength: 300 })
  @Column({ type: 'varchar', length: 300, default: '' })
  landmark: string;

  @ApiProperty({ maxLength: 120 })
  @Column({ type: 'varchar', length: 120 })
  city: string;

  @ApiProperty({ maxLength: 10 })
  @Column({ type: 'varchar', length: 10 })
  pin: string;

  @ApiProperty({ enum: DeliveryAddressTag })
  @Column({ type: 'enum', enum: DeliveryAddressTag })
  tag: DeliveryAddressTag;

  @ApiProperty({ maxLength: 120 })
  @Column({ type: 'varchar', length: 120 })
  label: string;

  @ApiProperty({
    description: 'The address used for checkout / header when multiple exist.',
  })
  @Column({ type: 'boolean', default: false })
  isDefault: boolean;
}
