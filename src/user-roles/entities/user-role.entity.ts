import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../commons/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { UserRoleKind } from '../enums/user-role-kind.enum';

@Entity('user_roles')
@Index(['userId'])
export class UserRole extends BaseEntity {
  @ApiProperty({ format: 'uuid' })
  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ApiProperty({ enum: UserRoleKind })
  @Column({ type: 'enum', enum: UserRoleKind, enumName: 'user_roles_role_enum' })
  role: UserRoleKind;
}
