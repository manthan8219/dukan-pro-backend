import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'Ada' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  firstName: string;

  @ApiProperty({ example: 'Lovelace' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  lastName: string;

  @ApiProperty({ example: 'ada@example.com' })
  @IsEmail()
  @MaxLength(255)
  email: string;

  @ApiProperty({ example: '+919876543210' })
  @IsString()
  @MinLength(5)
  @MaxLength(32)
  phoneNumber: string;
}
