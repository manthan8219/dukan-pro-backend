import { ApiProperty } from '@nestjs/swagger';
import { Column, PrimaryGeneratedColumn } from 'typeorm';
import { AuditFields } from './audit-fields.entity';

export abstract class BaseEntity extends AuditFields {
  @ApiProperty({ format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ default: false })
  @Column({ type: 'boolean', default: false })
  isDeleted: boolean;
}
