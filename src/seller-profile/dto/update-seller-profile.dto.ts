import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsDate, IsEnum, IsOptional } from 'class-validator';
import { SellerPlan } from '../enums/seller-plan.enum';

export class UpdateSellerProfileDto {
  @ApiPropertyOptional({ enum: SellerPlan })
  @IsOptional()
  @IsEnum(SellerPlan)
  plan?: SellerPlan;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  planStartedAt?: Date;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  planExpiresAt?: Date | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isTrialing?: boolean;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  trialEndsAt?: Date | null;
}
