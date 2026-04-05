import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CreateUserRoleDto } from './dto/create-user-role.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UserRole } from './entities/user-role.entity';
import { UserRolesService } from './user-roles.service';

@ApiTags('user-roles')
@Controller('user-roles')
export class UserRolesController {
  constructor(private readonly userRolesService: UserRolesService) {}

  @Post()
  @ApiOperation({ summary: 'Create user role' })
  @ApiCreatedResponse({ type: UserRole })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiConflictResponse({ description: 'Role already assigned for this user' })
  create(@Body() dto: CreateUserRoleDto): Promise<UserRole> {
    return this.userRolesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List user roles' })
  @ApiOkResponse({ type: UserRole, isArray: true })
  findAll(): Promise<UserRole[]> {
    return this.userRolesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user role by id' })
  @ApiOkResponse({ type: UserRole })
  @ApiNotFoundResponse({ description: 'Not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<UserRole> {
    return this.userRolesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user role' })
  @ApiOkResponse({ type: UserRole })
  @ApiNotFoundResponse({ description: 'Not found' })
  @ApiConflictResponse({ description: 'Role already assigned for this user' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserRoleDto,
  ): Promise<UserRole> {
    return this.userRolesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Soft-delete user role' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ description: 'Not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.userRolesService.remove(id);
  }
}
