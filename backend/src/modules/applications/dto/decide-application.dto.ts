import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ApplicationStatus } from '../entities/application.entity';

export class DecideApplicationDto {
  @ApiProperty({ enum: [ApplicationStatus.APPROVED, ApplicationStatus.REJECTED] })
  @IsEnum([ApplicationStatus.APPROVED, ApplicationStatus.REJECTED])
  decision: ApplicationStatus.APPROVED | ApplicationStatus.REJECTED;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}
