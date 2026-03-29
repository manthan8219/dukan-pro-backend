import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CreateSellerProfileDto } from './dto/create-seller-profile.dto';
import { UpdateSellerProfileDto } from './dto/update-seller-profile.dto';
import { SellerProfile } from './entities/seller-profile.entity';
import { SellerProfileService } from './seller-profile.service';

@ApiTags('seller-profiles')
@Controller('seller-profiles')
export class SellerProfileController {
  constructor(private readonly sellerProfileService: SellerProfileService) {}

  @Post()
  @ApiOperation({
    summary: 'Create seller profile (upgrades user role to SELLER)',
  })
  @ApiCreatedResponse({ type: SellerProfile })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiConflictResponse({
    description: 'Seller profile already exists for this user',
  })
  create(@Body() dto: CreateSellerProfileDto): Promise<SellerProfile> {
    return this.sellerProfileService.create(dto);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get seller profile by user id' })
  @ApiOkResponse({ type: SellerProfile })
  @ApiNotFoundResponse({ description: 'Seller profile not found' })
  findByUserId(
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<SellerProfile> {
    return this.sellerProfileService.findByUserId(userId);
  }

  @Patch('user/:userId')
  @ApiOperation({ summary: 'Update seller profile (e.g. change plan)' })
  @ApiOkResponse({ type: SellerProfile })
  @ApiNotFoundResponse({ description: 'Seller profile not found' })
  update(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateSellerProfileDto,
  ): Promise<SellerProfile> {
    return this.sellerProfileService.update(userId, dto);
  }
}
