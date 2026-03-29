import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseEntity } from '../../commons/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { UserNotificationType } from '../enums/user-notification-type.enum';

@Entity('user_notifications')
@Index(['userId', 'readAt'])
/** Idempotency: one row per user per logical event (invitation, order, monthly key, …). */
@Index(['userId', 'dedupeKey'], { unique: true })
export class UserNotification extends BaseEntity {
  @ApiProperty({ format: 'uuid' })
  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ApiProperty({ enum: UserNotificationType })
  @Column({ type: 'enum', enum: UserNotificationType })
  type: UserNotificationType;

  @ApiProperty({ maxLength: 200 })
  @Column({ type: 'varchar', length: 200 })
  title: string;

  @ApiPropertyOptional()
  @Column({ type: 'text', nullable: true })
  body: string | null;

  @ApiPropertyOptional({ format: 'date-time' })
  @Column({ type: 'timestamptz', nullable: true })
  readAt: Date | null;

  @ApiPropertyOptional({ format: 'uuid' })
  @Column({ type: 'uuid', nullable: true })
  invitationId: string | null;

  @ApiPropertyOptional({
    description:
      'Stable key for upserts, e.g. demand-shop-inv:{uuid}, seller-order:{uuid}, seller-insights:{userId}:2026-03',
    maxLength: 220,
  })
  @Column({ type: 'varchar', length: 220, nullable: true })
  dedupeKey: string | null;

  @ApiPropertyOptional({
    description:
      'Structured payload: invitationKind, demandId, shopId, orderId, period, deep link hints',
  })
  @Column({ type: 'jsonb', nullable: true })
  context: Record<string, unknown> | null;
}
