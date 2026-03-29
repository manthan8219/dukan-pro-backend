import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsDate, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { SellerPlan } from '../enums/seller-plan.enum';

export class CreateSellerProfileDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  userId: string;

  @ApiPropertyOptional({ enum: SellerPlan, default: SellerPlan.FREE })
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

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isTrialing?: boolean;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  trialEndsAt?: Date | null;
}
