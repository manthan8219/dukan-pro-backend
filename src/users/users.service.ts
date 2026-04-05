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

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  /**
   * Creates or updates the Postgres user for a Firebase sign-in.
   * Resolves by Firebase UID first, then by email (legacy rows without UID or after UID changes).
   */
  async upsertFromFirebase(claims: {
    uid: string;
    email?: string | null;
    displayName?: string | null;
    phoneNumber?: string | null;
  }): Promise<User> {
    const email =
      claims.email?.trim() || `${claims.uid}@firebase.dukaanpro.internal`;
    const { firstName, lastName } = splitDisplayName(claims.displayName);
    const phone = claims.phoneNumber?.trim() || '-';

    let existing =
      (await this.findByFirebaseUid(claims.uid)) ??
      (await this.findByEmail(email));

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
          existing =
            (await this.findByFirebaseUid(claims.uid)) ??
            (await this.findByEmail(email));
          if (existing) {
            return this.mergeFirebaseClaimsIntoUser(existing, claims, {
              firstName,
              lastName,
              phone,
            });
          }
          throw new ConflictException(
            'Could not create user (email may already exist).',
          );
        }
        throw err;
      }
    }

    return this.mergeFirebaseClaimsIntoUser(existing, claims, {
      firstName,
      lastName,
      phone,
    });
  }

  private mergeFirebaseClaimsIntoUser(
    user: User,
    claims: {
      uid: string;
      email?: string | null;
      displayName?: string | null;
      phoneNumber?: string | null;
    },
    parsed: { firstName: string; lastName: string; phone: string },
  ): Promise<User> {
    user.firebaseUid = claims.uid;
    user.lastLoginAt = new Date();
    if (
      claims.email?.trim() &&
      user.email.endsWith('@firebase.dukaanpro.internal')
    ) {
      user.email = claims.email.trim();
    }
    if (claims.displayName?.trim()) {
      user.firstName = parsed.firstName;
      user.lastName = parsed.lastName;
    }
    if (claims.phoneNumber?.trim() && user.phoneNumber === '-') {
      user.phoneNumber = parsed.phone;
    }
    return this.usersRepository.save(user);
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
