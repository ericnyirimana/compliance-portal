import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RecommendApplicationDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}
