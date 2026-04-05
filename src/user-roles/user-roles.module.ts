import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { UserRole } from './entities/user-role.entity';
import { UserRolesController } from './user-roles.controller';
import { UserRolesService } from './user-roles.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserRole]), UsersModule],
  controllers: [UserRolesController],
  providers: [UserRolesService],
  exports: [UserRolesService],
})
export class UserRolesModule {}
