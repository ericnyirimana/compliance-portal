import { IsEnum, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { LicenceType } from '../entities/application.entity';

export class CreateApplicationDto {
  @ApiProperty({ example: 'Kigali Commercial Bank Ltd' })
  @IsString()
  @MinLength(3)
  bankName: string;

  @ApiProperty({ enum: LicenceType })
  @IsEnum(LicenceType)
  licenceType: LicenceType;

  @ApiProperty({ example: 5000000000 })
  @IsNumber()
  @Min(1)
  capitalAmount: number;

  @ApiProperty({ required: false, example: 'KG 1 Ave, Kigali, Rwanda' })
  @IsString()
  @IsOptional()
  address?: string;
}
