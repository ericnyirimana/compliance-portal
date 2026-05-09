import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Document } from './entities/document.entity';
import { DocumentVersion } from './entities/document-version.entity';
import { Application } from '../applications/entities/application.entity';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Document, DocumentVersion, Application]),
    AuditModule,
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
