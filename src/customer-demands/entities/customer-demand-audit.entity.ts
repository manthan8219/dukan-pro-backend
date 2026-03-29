import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CustomerDemandAuditAction } from '../enums/customer-demand-audit-action.enum';
import { CustomerDemand } from './customer-demand.entity';

/**
 * Append-only history of changes to a customer demand.
 * `payload` holds structured before/after snapshots (see service).
 */
@Entity('customer_demand_audits')
@Index(['demandId', 'occurredAt'])
export class CustomerDemandAudit {
  @ApiProperty({ format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ format: 'uuid' })
  @Column({ type: 'uuid' })
  demandId: string;

  @ManyToOne(() => CustomerDemand, (d) => d.audits, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'demandId' })
  demand: CustomerDemand;

  @ApiProperty()
  @CreateDateColumn({ type: 'timestamptz' })
  occurredAt: Date;

  @ApiPropertyOptional({ format: 'uuid' })
  @Column({ type: 'uuid', nullable: true })
  actorUserId: string | null;

  @ApiProperty({ enum: CustomerDemandAuditAction })
  @Column({ type: 'enum', enum: CustomerDemandAuditAction })
  action: CustomerDemandAuditAction;

  @ApiProperty({
    description: 'Typically { before?, after? } snapshots of editable fields',
    type: 'object',
    additionalProperties: true,
  })
  @Column({ type: 'jsonb' })
  payload: Record<string, unknown>;
}
