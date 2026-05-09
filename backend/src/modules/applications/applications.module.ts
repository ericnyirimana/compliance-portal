import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Application } from './entities/application.entity';
import { Review } from './entities/review.entity';
import { ApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';
import { StateMachineService } from './state-machine.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Application, Review]),
    AuditModule,
  ],
  controllers: [ApplicationsController],
  providers: [ApplicationsService, StateMachineService],
  exports: [ApplicationsService],
})
export class ApplicationsModule {}
