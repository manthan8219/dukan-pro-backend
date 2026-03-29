import { PartialType } from '@nestjs/swagger';
import { CreateUserDeliveryAddressDto } from './create-user-delivery-address.dto';

/** All fields optional; `setAsDefault: true` marks this row as the active delivery address. */
export class UpdateUserDeliveryAddressDto extends PartialType(
  CreateUserDeliveryAddressDto,
) {}
