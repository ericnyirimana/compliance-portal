import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../modules/users/entities/user.entity';
import { RefreshToken } from '../modules/users/entities/refresh-token.entity';
import { Application } from '../modules/applications/entities/application.entity';
import { Review } from '../modules/applications/entities/review.entity';
import { Document } from '../modules/documents/entities/document.entity';
import { DocumentVersion } from '../modules/documents/entities/document-version.entity';
import { AuditLog } from '../modules/audit/entities/audit-log.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'postgres',
        url: process.env.DATABASE_URL,
        synchronize: false,
        logging: process.env.NODE_ENV === 'development',
        entities: [User, RefreshToken, Application, Review, Document, DocumentVersion, AuditLog],
        migrations: [],
      }),
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
