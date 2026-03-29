import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseEntity } from '../../commons/entities/base.entity';
import { Column, Entity, Index } from 'typeorm';

@Entity('products')
@Index(['nameNormalized'], { unique: true })
export class Product extends BaseEntity {
  @ApiProperty({ example: 'Tata Salt 1kg' })
  @Column({ type: 'varchar', length: 200 })
  name: string;

  @ApiProperty({
    description: 'Lowercase trimmed name for uniqueness and lookup',
    example: 'tata salt 1kg',
  })
  @Column({ type: 'varchar', length: 200 })
  nameNormalized: string;

  @ApiPropertyOptional()
  @Column({ type: 'text', nullable: true })
  description: string | null;

  @ApiPropertyOptional({ example: 'Grocery' })
  @Column({ type: 'varchar', length: 100, nullable: true })
  category: string | null;

  @ApiPropertyOptional({
    description:
      'Fallback image when a shop listing has no custom image (HTTPS URL or storage key)',
  })
  @Column({ type: 'varchar', length: 2048, nullable: true })
  defaultImageUrl: string | null;

  @ApiPropertyOptional({
    description:
      'Alternate searchable labels (synonyms, local names, abbreviations). Used by GET /products/search and by-name when matching exactly.',
    example: ['namak', 'table salt', 'iodized salt'],
    type: [String],
  })
  @Column({ type: 'text', array: true, nullable: true })
  searchTerms: string[] | null;
}
