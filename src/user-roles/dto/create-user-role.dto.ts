import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsUUID } from 'class-validator';
import { UserRoleKind } from '../enums/user-role-kind.enum';

export class CreateUserRoleDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  userId: string;

  @ApiProperty({ enum: UserRoleKind })
  @IsEnum(UserRoleKind)
  role: UserRoleKind;
}
