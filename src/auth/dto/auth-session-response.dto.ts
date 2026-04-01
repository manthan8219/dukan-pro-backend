import { ApiProperty } from '@nestjs/swagger';

export class AuthSessionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({
    description: 'Buyer-app capability (discover shops, orders, etc.).',
  })
  isCustomer!: boolean;

  @ApiProperty({
    description: 'Seller-hub capability (shop dashboard, inventory, etc.).',
  })
  isSeller!: boolean;

  @ApiProperty()
  sellerOnboardingComplete!: boolean;
}
