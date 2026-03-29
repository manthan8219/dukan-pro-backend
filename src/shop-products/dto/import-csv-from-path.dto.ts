import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class ImportCsvFromPathDto {
  @ApiProperty({
    description:
      'Path relative to CSV_IMPORT_BASE_DIR (server env). Must stay under that directory.',
    example: 'incoming/weekly-stock.csv',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(2048)
  relativePath: string;
}
