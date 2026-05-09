import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { Readable } from 'stream';
import { Document } from './entities/document.entity';
import { DocumentVersion } from './entities/document-version.entity';
import { Application } from '../applications/entities/application.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { AuditService } from '../audit/audit.service';
import { MAX_FILE_SIZE_BYTES, ALLOWED_MIME_TYPES } from '../../common/constants';

@Injectable()
export class DocumentsService {
  private readonly storagePath: string;

  constructor(
    @InjectRepository(Document)
    private readonly docRepo: Repository<Document>,
    @InjectRepository(DocumentVersion)
    private readonly docVersionRepo: Repository<DocumentVersion>,
    @InjectRepository(Application)
    private readonly appRepo: Repository<Application>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
  ) {
    this.storagePath = process.env.STORAGE_PATH || path.join(process.cwd(), 'storage');
  }

  /**
   * Stream the incoming multipart upload, enforce 5MB cap,
   * sniff MIME type from magic bytes, sanitize filename, store to disk,
   * create/update Document + DocumentVersion rows, write audit entry.
   */
  async upload(
    applicationId: string,
    slot: string,
    stream: Readable,
    originalFilename: string,
    user: User,
    requestId: string,
    ip: string,
  ): Promise<DocumentVersion> {
    // Verify application exists and user has access
    const app = await this.appRepo.findOne({ where: { id: applicationId } });
    if (!app) {
      throw new NotFoundException({ code: 'APPLICATION_NOT_FOUND', message: `Application ${applicationId} not found` });
    }

    if (user.role === UserRole.APPLICANT && app.applicantId !== user.id) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Access denied' });
    }

    // Collect stream into buffer while enforcing 5MB cap
    const buffer = await this.collectStream(stream);

    // Sniff MIME type from magic bytes (NOT Content-Type header)
    const { fileTypeFromBuffer } = await import('file-type');
    const detected = await fileTypeFromBuffer(buffer);

    if (!detected || !ALLOWED_MIME_TYPES.includes(detected.mime)) {
      throw new BadRequestException({
        code: 'INVALID_MIME_TYPE',
        message: `File type not allowed. Permitted types: PDF, PNG, JPEG, DOCX. Detected: ${detected?.mime ?? 'unknown'}`,
      });
    }

    const safeFilename = this.sanitizeFilename(originalFilename);
    const fileId = crypto.randomUUID();

    return this.dataSource.transaction(async (manager) => {
      const qr = manager.queryRunner!;

      // Upsert Document record (slot may already exist from a prior upload)
      let doc = await manager.findOne(Document, {
        where: { applicationId, slot },
      });

      if (!doc) {
        doc = manager.create(Document, {
          applicationId,
          slot,
          currentVersionNumber: 0,
        });
        await manager.save(doc);
      }

      const nextVersion = doc.currentVersionNumber + 1;
      doc.currentVersionNumber = nextVersion;
      await manager.save(doc);

      // Store file
      const storagePath = path.join(
        this.storagePath,
        applicationId,
        slot,
        String(nextVersion),
      );
      fs.mkdirSync(storagePath, { recursive: true });

      const storedFilename = `${fileId}__${safeFilename}`;
      const fullPath = path.join(storagePath, storedFilename);
      fs.writeFileSync(fullPath, buffer);

      // Create DocumentVersion record
      const docVersion = manager.create(DocumentVersion, {
        documentId: doc.id,
        versionNumber: nextVersion,
        filenameOriginal: originalFilename,
        filenameStored: storedFilename,
        storagePath: path.join(applicationId, slot, String(nextVersion), storedFilename),
        mimeType: detected.mime,
        sizeBytes: String(buffer.length),
        uploadedById: user.id,
      });
      await manager.save(docVersion);

      // Audit the upload
      await this.auditService.write(
        {
          actorUserId: user.id,
          action: 'DOCUMENT_UPLOADED',
          applicationId,
          payload: {
            slot,
            versionNumber: nextVersion,
            filename: originalFilename,
            mimeType: detected.mime,
            sizeBytes: buffer.length,
          },
          requestId,
          ip,
        },
        qr,
      );

      return docVersion;
    });
  }

  async listVersions(
    applicationId: string,
    slot: string,
    user: User,
  ): Promise<DocumentVersion[]> {
    await this.checkApplicationAccess(applicationId, user);

    const doc = await this.docRepo.findOne({ where: { applicationId, slot } });
    if (!doc) {
      throw new NotFoundException({ code: 'DOCUMENT_NOT_FOUND', message: `No document for slot ${slot}` });
    }

    return this.docVersionRepo.find({
      where: { documentId: doc.id },
      order: { versionNumber: 'ASC' },
    });
  }

  async listSlots(applicationId: string, user: User): Promise<Document[]> {
    await this.checkApplicationAccess(applicationId, user);
    return this.docRepo.find({
      where: { applicationId },
      order: { createdAt: 'ASC' },
    });
  }

  async download(
    applicationId: string,
    slot: string,
    versionId: string,
    user: User,
  ): Promise<{ filePath: string; mimeType: string; filename: string }> {
    await this.checkApplicationAccess(applicationId, user);

    const version = await this.docVersionRepo.findOne({ where: { id: versionId } });
    if (!version) {
      throw new NotFoundException({ code: 'DOCUMENT_VERSION_NOT_FOUND', message: 'Document version not found' });
    }

    const fullPath = path.join(this.storagePath, version.storagePath);
    if (!fs.existsSync(fullPath)) {
      throw new NotFoundException({ code: 'FILE_NOT_FOUND', message: 'File not found on disk' });
    }

    return {
      filePath: fullPath,
      mimeType: version.mimeType,
      filename: version.filenameOriginal,
    };
  }

  private async checkApplicationAccess(applicationId: string, user: User): Promise<void> {
    const app = await this.appRepo.findOne({ where: { id: applicationId } });
    if (!app) {
      throw new NotFoundException({ code: 'APPLICATION_NOT_FOUND', message: `Application ${applicationId} not found` });
    }
    if (user.role === UserRole.APPLICANT && app.applicantId !== user.id) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Access denied' });
    }
  }

  private async collectStream(stream: Readable): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      let totalBytes = 0;

      stream.on('data', (chunk: Buffer) => {
        totalBytes += chunk.length;
        if (totalBytes > MAX_FILE_SIZE_BYTES) {
          stream.destroy();
          reject(
            new PayloadTooLargeException({
              code: 'FILE_TOO_LARGE',
              message: `File exceeds the maximum allowed size of ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB`,
            }),
          );
          return;
        }
        chunks.push(chunk);
      });

      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }

  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/\.{2,}/g, '_')
      .replace(/^[._-]/, '_')
      .slice(0, 200);
  }
}
