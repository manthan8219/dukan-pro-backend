import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID } from 'class-validator';

export class ReorderShopContentDto {
  @ApiProperty({
    description:
      'Shop content link IDs in desired display order (must include every active link for this shop; empty if none)',
    type: [String],
    format: 'uuid',
  })
  @IsArray()
  @IsUUID('4', { each: true })
  orderedLinkIds: string[];
}
