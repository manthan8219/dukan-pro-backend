import { ApiProperty } from '@nestjs/swagger';

export class SessionIdResponseDto {
  @ApiProperty({ format: 'uuid' })
  sessionId!: string;
}
