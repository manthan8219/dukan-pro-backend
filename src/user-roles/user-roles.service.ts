import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import { CreateUserRoleDto } from './dto/create-user-role.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UserRole } from './entities/user-role.entity';
import { UserRoleKind } from './enums/user-role-kind.enum';

@Injectable()
export class UserRolesService {
  constructor(
    @InjectRepository(UserRole)
    private readonly userRolesRepository: Repository<UserRole>,
    private readonly usersService: UsersService,
  ) {}

  async create(dto: CreateUserRoleDto): Promise<UserRole> {
    await this.usersService.findOne(dto.userId);
    await this.assertNoDuplicateRole(dto.userId, dto.role);
    const row = this.userRolesRepository.create(dto);
    return this.userRolesRepository.save(row);
  }

  /**
   * Ensures an active role row exists for the user (idempotent; safe on repeat sign-in).
   */
  async ensureRole(userId: string, role: UserRoleKind): Promise<UserRole> {
    await this.usersService.findOne(userId);
    const existing = await this.userRolesRepository.findOne({
      where: { userId, role, isDeleted: false },
    });
    if (existing) {
      return existing;
    }
    const row = this.userRolesRepository.create({ userId, role });
    return this.userRolesRepository.save(row);
  }

  async findAll(): Promise<UserRole[]> {
    return this.userRolesRepository.find({
      where: { isDeleted: false },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<UserRole> {
    const row = await this.userRolesRepository.findOne({
      where: { id, isDeleted: false },
    });
    if (!row) {
      throw new NotFoundException(`User role ${id} not found`);
    }
    return row;
  }

  async update(id: string, dto: UpdateUserRoleDto): Promise<UserRole> {
    const row = await this.findOne(id);
    const nextUserId = dto.userId ?? row.userId;
    const nextRole = dto.role ?? row.role;
    if (dto.userId !== undefined) {
      await this.usersService.findOne(dto.userId);
    }
    if (dto.userId !== undefined || dto.role !== undefined) {
      await this.assertNoDuplicateRole(nextUserId, nextRole, id);
    }
    Object.assign(row, dto);
    return this.userRolesRepository.save(row);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.userRolesRepository.update({ id }, { isDeleted: true });
  }

  private async assertNoDuplicateRole(
    userId: string,
    role: UserRole['role'],
    excludeId?: string,
  ): Promise<void> {
    const qb = this.userRolesRepository
      .createQueryBuilder('r')
      .where('r.userId = :userId', { userId })
      .andWhere('r.role = :role', { role })
      .andWhere('r.isDeleted = false');
    if (excludeId) {
      qb.andWhere('r.id != :excludeId', { excludeId });
    }
    const existing = await qb.getOne();
    if (existing) {
      throw new ConflictException(
        `User ${userId} already has role ${role}`,
      );
    }
  }
}
