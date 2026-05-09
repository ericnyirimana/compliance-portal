import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RequestInfoDto {
  @ApiProperty({ example: 'Please provide audited financial statements for the last 3 years.' })
  @IsString()
  @MinLength(10)
  notes: string;
}
