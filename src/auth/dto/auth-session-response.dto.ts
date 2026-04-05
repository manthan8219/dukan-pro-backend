import { ApiProperty } from '@nestjs/swagger';

export class AuthSessionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;
}
