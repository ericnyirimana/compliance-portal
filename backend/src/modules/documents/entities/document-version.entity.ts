import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Document } from './document.entity';
import { User } from '../../users/entities/user.entity';

@Entity('document_versions')
export class DocumentVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Document)
  document: Document;

  @Column({ name: 'document_id' })
  documentId: string;

  @Column({ name: 'version_number' })
  versionNumber: number;

  @Column({ name: 'filename_original' })
  filenameOriginal: string;

  @Column({ name: 'filename_stored' })
  filenameStored: string;

  @Column({ name: 'storage_path' })
  storagePath: string;

  @Column({ name: 'mime_type' })
  mimeType: string;

  @Column({ name: 'size_bytes', type: 'bigint' })
  sizeBytes: string;

  @ManyToOne(() => User)
  uploadedBy: User;

  @Column({ name: 'uploaded_by_id' })
  uploadedById: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
