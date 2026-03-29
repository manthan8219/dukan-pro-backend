import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiPropertyOptional({
    description: 'Whether the seller has finished shop setup onboarding.',
  })
  @IsOptional()
  @IsBoolean()
  sellerOnboardingComplete?: boolean;
}
