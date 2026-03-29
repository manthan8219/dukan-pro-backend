import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DeliveryAddressTag } from '../enums/delivery-address-tag.enum';

export class UserDeliveryAddressResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  fullName: string;

  @ApiProperty()
  phone: string;

  @ApiProperty()
  line1: string;

  @ApiProperty()
  line2: string;

  @ApiProperty()
  landmark: string;

  @ApiProperty()
  city: string;

  @ApiProperty()
  pin: string;

  @ApiProperty({ enum: DeliveryAddressTag })
  tag: DeliveryAddressTag;

  @ApiProperty()
  label: string;

  @ApiProperty()
  isDefault: boolean;

  @ApiPropertyOptional({ nullable: true, description: 'WGS84 latitude from map pin' })
  latitude: number | null;

  @ApiPropertyOptional({ nullable: true, description: 'WGS84 longitude from map pin' })
  longitude: number | null;
}
