import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseEntity } from '../../commons/entities/base.entity';
import { Column, Entity, Index } from 'typeorm';
import { ContentKind } from '../content-kind.enum';

@Entity('contents')
@Index(['kind'])
@Index(['ownerUserId'])
export class Content extends BaseEntity {
  @ApiProperty({
    description: 'Where the bytes live (S3 key, HTTPS URL, disk path, etc.)',
    example: 'https://cdn.example.com/shops/abc/photo.jpg',
  })
  @Column({ type: 'varchar', length: 2048 })
  storageUrl: string;

  @ApiProperty({ enum: ContentKind, example: ContentKind.IMAGE })
  @Column({ type: 'enum', enum: ContentKind })
  kind: ContentKind;

  @ApiPropertyOptional({ example: 'image/jpeg' })
  @Column({ type: 'varchar', length: 128, nullable: true })
  mimeType: string | null;

  @ApiPropertyOptional({ example: 'storefront.jpg' })
  @Column({ type: 'varchar', length: 512, nullable: true })
  originalFileName: string | null;

  @ApiPropertyOptional({ example: 245678 })
  @Column({ type: 'bigint', nullable: true })
  byteSize: string | null;

  @ApiPropertyOptional({
    description: 'Uploader (optional; set when you know the user)',
    format: 'uuid',
  })
  @Column({ type: 'uuid', nullable: true })
  ownerUserId: string | null;

  @ApiPropertyOptional({
    description: 'Extra JSON (dimensions, checksum, storage provider id, …)',
  })
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;
}
