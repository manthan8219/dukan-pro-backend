import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../commons/entities/base.entity';
import { UserRole } from '../enums/user-role.enum';

@Entity('users')
export class User extends BaseEntity {
  @ApiProperty()
  @Column({ type: 'varchar', length: 120 })
  firstName: string;

  @ApiProperty()
  @Column({ type: 'varchar', length: 120 })
  lastName: string;

  @ApiProperty({ format: 'email' })
  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @ApiProperty()
  @Column({ type: 'varchar', length: 32 })
  phoneNumber: string;

  @ApiProperty()
  @Column({ type: 'boolean', default: false })
  isVerified: boolean;

  @ApiPropertyOptional({
    enum: UserRole,
    description:
      'Null until the user chooses customer or seller; then locked (see PATCH /users/:id).',
    nullable: true,
  })
  @Column({ type: 'enum', enum: UserRole, nullable: true })
  role: UserRole | null;

  @ApiPropertyOptional({
    description:
      'Firebase Authentication UID; links this row to the signed-in Firebase user.',
  })
  @Column({ type: 'varchar', length: 128, unique: true, nullable: true })
  firebaseUid: string | null;

  @ApiPropertyOptional({
    description:
      'True after seller shop onboarding is finished (shop created).',
    default: false,
  })
  @Column({ type: 'boolean', default: false })
  sellerOnboardingComplete: boolean;

  // ✅ Track last login (analytics + debugging)
  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt: Date;
}
