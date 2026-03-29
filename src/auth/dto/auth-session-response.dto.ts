import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../users/enums/user-role.enum';

export class AuthSessionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({
    enum: UserRole,
    nullable: true,
    description: 'Null until the user selects customer or seller on first sign-in.',
  })
  role!: UserRole | null;

  @ApiProperty()
  sellerOnboardingComplete!: boolean;
}
