import { Module } from '@nestjs/common';
import { ShopsModule } from '../shops/shops.module';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [UsersModule, ShopsModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
