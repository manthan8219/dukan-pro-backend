import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, Index, JoinColumn, OneToOne } from 'typeorm';
import { BaseEntity } from '../../commons/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { SellerPlan } from '../enums/seller-plan.enum';

@Entity('seller_profiles')
@Index(['userId'], { unique: true })
export class SellerProfile extends BaseEntity {
  @ApiProperty({ format: 'uuid' })
  @Column({ type: 'uuid' })
  userId: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ApiProperty({ enum: SellerPlan, default: SellerPlan.FREE })
  @Column({ type: 'enum', enum: SellerPlan, default: SellerPlan.FREE })
  plan: SellerPlan;

  @ApiProperty({ description: 'When the current plan started' })
  @Column({ type: 'timestamptz' })
  planStartedAt: Date;

  @ApiPropertyOptional({
    description:
      'When the current plan expires; null means perpetual (e.g. FREE tier)',
  })
  @Column({ type: 'timestamptz', nullable: true })
  planExpiresAt: Date | null;

  @ApiProperty({ default: false })
  @Column({ type: 'boolean', default: false })
  isTrialing: boolean;

  @ApiPropertyOptional({
    description: 'When the trial period ends; null when not trialing',
  })
  @Column({ type: 'timestamptz', nullable: true })
  trialEndsAt: Date | null;
}
