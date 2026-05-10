import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { InitialSchema1700000001000 } from './migrations/001_initial_schema';
import { SecurityGrantsAndTriggers1700000002000 } from './migrations/002_security_grants_and_triggers';
import { User } from '../modules/users/entities/user.entity';
import { RefreshToken } from '../modules/users/entities/refresh-token.entity';
import { Application } from '../modules/applications/entities/application.entity';
import { Review } from '../modules/applications/entities/review.entity';
import { Document } from '../modules/documents/entities/document.entity';
import { DocumentVersion } from '../modules/documents/entities/document-version.entity';
import { AuditLog } from '../modules/audit/entities/audit-log.entity';

dotenv.config({ path: path.join(__dirname, '../../', '.env') });

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_OWNER_URL || process.env.DATABASE_URL,
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
  entities: [User, RefreshToken, Application, Review, Document, DocumentVersion, AuditLog],
  migrations: [InitialSchema1700000001000, SecurityGrantsAndTriggers1700000002000],
  migrationsTableName: 'typeorm_migrations',
});
