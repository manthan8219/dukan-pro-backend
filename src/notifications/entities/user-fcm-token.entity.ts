import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from '../../commons/entities/base.entity';
import { User } from '../../users/entities/user.entity';

@Entity('user_fcm_tokens')
@Unique(['token'])
@Index(['userId'])
export class UserFcmToken extends BaseEntity {
  @ApiProperty({ format: 'uuid' })
  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @ApiProperty({ description: 'FCM registration token from the device' })
  @Column({ type: 'varchar', length: 512 })
  token: string;

  @ApiPropertyOptional()
  @Column({ type: 'varchar', length: 32, nullable: true })
  platform: string | null;
}
