import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CreateShopDto } from './dto/create-shop.dto';
import { Shop } from './entities/shop.entity';
import { ShopsService } from './shops.service';

@ApiTags('shops')
@Controller('users/:userId/shops')
export class UserShopsController {
  constructor(private readonly shopsService: ShopsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a shop for a user' })
  @ApiCreatedResponse({ type: Shop })
  @ApiNotFoundResponse({ description: 'User not found' })
  create(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: CreateShopDto,
  ): Promise<Shop> {
    return this.shopsService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List shops owned by a user' })
  @ApiOkResponse({ type: Shop, isArray: true })
  @ApiNotFoundResponse({ description: 'User not found' })
  findByUser(@Param('userId', ParseUUIDPipe) userId: string): Promise<Shop[]> {
    return this.shopsService.findByUserId(userId);
  }
}
