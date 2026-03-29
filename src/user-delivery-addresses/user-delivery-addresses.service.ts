import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import { CreateUserDeliveryAddressDto } from './dto/create-user-delivery-address.dto';
import { UpdateUserDeliveryAddressDto } from './dto/update-user-delivery-address.dto';
import { UserDeliveryAddressResponseDto } from './dto/user-delivery-address-response.dto';
import { UserDeliveryAddress } from './entities/user-delivery-address.entity';
import { DeliveryAddressTag } from './enums/delivery-address-tag.enum';

@Injectable()
export class UserDeliveryAddressesService {
  constructor(
    @InjectRepository(UserDeliveryAddress)
    private readonly addressRepository: Repository<UserDeliveryAddress>,
    private readonly usersService: UsersService,
  ) {}

  private activeWhere(userId: string) {
    return { userId, isDeleted: false };
  }

  private toDto(row: UserDeliveryAddress): UserDeliveryAddressResponseDto {
    return {
      id: row.id,
      fullName: row.fullName,
      phone: row.phone,
      line1: row.line1,
      line2: row.line2,
      landmark: row.landmark,
      city: row.city,
      pin: row.pin,
      tag: row.tag,
      label: row.label,
      isDefault: row.isDefault,
    };
  }

  private resolveLabelOnCreate(
    tag: DeliveryAddressTag,
    label?: string,
  ): string {
    if (tag === DeliveryAddressTag.HOME) {
      return 'Home';
    }
    if (tag === DeliveryAddressTag.OFFICE) {
      return 'Office';
    }
    const t = (label ?? '').trim();
    if (!t) {
      throw new BadRequestException('label is required when tag is other');
    }
    return t;
  }

  private resolveLabelOnUpdate(
    tag: DeliveryAddressTag,
    dtoLabel: string | undefined,
    previous: UserDeliveryAddress,
  ): string {
    if (tag === DeliveryAddressTag.HOME) {
      return 'Home';
    }
    if (tag === DeliveryAddressTag.OFFICE) {
      return 'Office';
    }
    if (dtoLabel !== undefined) {
      const t = dtoLabel.trim();
      if (!t) {
        throw new BadRequestException('label cannot be empty when tag is other');
      }
      return t;
    }
    if (previous.tag === DeliveryAddressTag.OTHER && tag === DeliveryAddressTag.OTHER) {
      return previous.label;
    }
    throw new BadRequestException('label is required when tag is other');
  }

  private async clearDefaultForUser(userId: string): Promise<void> {
    await this.addressRepository.update(this.activeWhere(userId), {
      isDefault: false,
    });
  }

  async list(userId: string): Promise<UserDeliveryAddressResponseDto[]> {
    await this.usersService.findOne(userId);
    const rows = await this.addressRepository.find({
      where: this.activeWhere(userId),
      order: { isDefault: 'DESC', createdAt: 'ASC' },
    });
    return rows.map((r) => this.toDto(r));
  }

  async create(
    userId: string,
    dto: CreateUserDeliveryAddressDto,
  ): Promise<UserDeliveryAddressResponseDto> {
    await this.usersService.findOne(userId);
    const count = await this.addressRepository.count({
      where: this.activeWhere(userId),
    });
    const isDefault =
      count === 0 || dto.setAsDefault === true;
    if (isDefault) {
      await this.clearDefaultForUser(userId);
    }
    const label = this.resolveLabelOnCreate(dto.tag, dto.label);
    const row = this.addressRepository.create({
      userId,
      fullName: dto.fullName.trim(),
      phone: dto.phone.trim(),
      line1: dto.line1.trim(),
      line2: (dto.line2 ?? '').trim(),
      landmark: (dto.landmark ?? '').trim(),
      city: dto.city.trim(),
      pin: dto.pin.trim(),
      tag: dto.tag,
      label,
      isDefault,
    });
    const saved = await this.addressRepository.save(row);
    return this.toDto(saved);
  }

  private async findOwned(
    userId: string,
    addressId: string,
  ): Promise<UserDeliveryAddress> {
    await this.usersService.findOne(userId);
    const row = await this.addressRepository.findOne({
      where: { ...this.activeWhere(userId), id: addressId },
    });
    if (!row) {
      throw new NotFoundException(`Delivery address ${addressId} not found`);
    }
    return row;
  }

  async update(
    userId: string,
    addressId: string,
    dto: UpdateUserDeliveryAddressDto,
  ): Promise<UserDeliveryAddressResponseDto> {
    const row = await this.findOwned(userId, addressId);
    const tag = dto.tag ?? row.tag;
    const label = this.resolveLabelOnUpdate(tag, dto.label, row);

    row.fullName =
      dto.fullName !== undefined ? dto.fullName.trim() : row.fullName;
    row.phone = dto.phone !== undefined ? dto.phone.trim() : row.phone;
    row.line1 = dto.line1 !== undefined ? dto.line1.trim() : row.line1;
    row.line2 = dto.line2 !== undefined ? dto.line2.trim() : row.line2;
    row.landmark =
      dto.landmark !== undefined ? dto.landmark.trim() : row.landmark;
    row.city = dto.city !== undefined ? dto.city.trim() : row.city;
    row.pin = dto.pin !== undefined ? dto.pin.trim() : row.pin;
    row.tag = tag;
    row.label = label;

    if (dto.setAsDefault === true) {
      await this.clearDefaultForUser(userId);
      row.isDefault = true;
    }

    await this.addressRepository.save(row);
    return this.toDto(row);
  }

  async remove(userId: string, addressId: string): Promise<void> {
    const row = await this.findOwned(userId, addressId);
    const wasDefault = row.isDefault;
    row.isDeleted = true;
    await this.addressRepository.save(row);

    if (wasDefault) {
      const next = await this.addressRepository.findOne({
        where: this.activeWhere(userId),
        order: { createdAt: 'ASC' },
      });
      if (next) {
        next.isDefault = true;
        await this.addressRepository.save(next);
      }
    }
  }
}
