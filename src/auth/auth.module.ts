import { Module } from '@nestjs/common';
import { UserRolesModule } from '../user-roles/user-roles.module';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [UsersModule, UserRolesModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
