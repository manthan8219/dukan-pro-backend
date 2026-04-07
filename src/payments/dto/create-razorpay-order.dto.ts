import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsUUID } from 'class-validator';

export class CreateRazorpayOrderDto {
  @ApiProperty({ enum: ['monthly', 'yearly'] })
  @IsIn(['monthly', 'yearly'])
  planId: 'monthly' | 'yearly';

  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  shopId: string;
}
