import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async create(dto: CreateUserDto): Promise<User> {
    const user = this.usersRepository.create(dto);
    try {
      return await this.usersRepository.save(user);
    } catch (err: unknown) {
      if (this.isUniqueViolation(err)) {
        throw new ConflictException('A user with this email already exists');
      }
      throw err;
    }
  }

  async findOne(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    return user;
  }

  async findByFirebaseUid(firebaseUid: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { firebaseUid } });
  }

  /**
   * Creates or updates the Postgres user for a Firebase sign-in.
   */
  async upsertFromFirebase(claims: {
    uid: string;
    email?: string | null;
    displayName?: string | null;
    phoneNumber?: string | null;
  }): Promise<User> {
    const existing = await this.findByFirebaseUid(claims.uid);
    const email =
      claims.email?.trim() || `${claims.uid}@firebase.dukaanpro.internal`;
    const { firstName, lastName } = splitDisplayName(claims.displayName);
    const phone = claims.phoneNumber?.trim() || '-';

    if (!existing) {
      const user = this.usersRepository.create({
        firebaseUid: claims.uid,
        firstName,
        lastName,
        email,
        phoneNumber: phone,
        isVerified: true,
        lastLoginAt: new Date(),
      });
      try {
        return await this.usersRepository.save(user);
      } catch (err: unknown) {
        if (this.isUniqueViolation(err)) {
          throw new ConflictException(
            'Could not create user (email may already exist).',
          );
        }
        throw err;
      }
    }

    existing.lastLoginAt = new Date();
    if (
      claims.email?.trim() &&
      existing.email.endsWith('@firebase.dukaanpro.internal')
    ) {
      existing.email = claims.email.trim();
    }
    if (claims.displayName?.trim()) {
      existing.firstName = firstName;
      existing.lastName = lastName;
    }
    if (claims.phoneNumber?.trim() && existing.phoneNumber === '-') {
      existing.phoneNumber = phone;
    }
    return this.usersRepository.save(existing);
  }

  /**
   * PATCH /users/:id
   */
  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);
    Object.assign(user, dto);
    try {
      return await this.usersRepository.save(user);
    } catch (err: unknown) {
      if (this.isUniqueViolation(err)) {
        throw new ConflictException('A user with this email already exists');
      }
      throw err;
    }
  }

  private isUniqueViolation(err: unknown): boolean {
    if (err instanceof QueryFailedError) {
      const driver = err.driverError as { code?: string } | undefined;
      return driver?.code === '23505';
    }
    return false;
  }
}

function splitDisplayName(name: string | null | undefined): {
  firstName: string;
  lastName: string;
} {
  const n = (name ?? '').trim();
  if (!n) {
    return { firstName: 'User', lastName: '' };
  }
  const parts = n.split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' };
  }
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}
