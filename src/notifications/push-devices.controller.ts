import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { User } from '../users/entities/user.entity';
import { RegisterFcmTokenDto } from './dto/register-fcm-token.dto';
import { FcmPushService } from './fcm-push.service';

@ApiTags('push-devices')
@Controller()
@UseGuards(FirebaseAuthGuard)
@ApiBearerAuth()
@ApiUnauthorizedResponse()
export class PushDevicesController {
  constructor(private readonly fcmPush: FcmPushService) {}

  @Post('users/me/fcm-token')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Register or refresh an FCM device token for the signed-in user',
  })
  @ApiNoContentResponse()
  async registerFcm(
    @CurrentUser() user: User,
    @Body() dto: RegisterFcmTokenDto,
  ): Promise<void> {
    await this.fcmPush.registerToken(user.id, dto.token, dto.platform);
  }
}
