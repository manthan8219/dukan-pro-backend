import { PartialType } from '@nestjs/swagger';
import { CreateShopDeliveryRadiusRuleDto } from './create-shop-delivery-radius-rule.dto';

export class UpdateShopDeliveryRadiusRuleDto extends PartialType(
  CreateShopDeliveryRadiusRuleDto,
) {}
