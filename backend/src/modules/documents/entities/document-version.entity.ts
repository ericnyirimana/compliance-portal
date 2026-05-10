import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Document } from './document.entity';
import { User } from '../../users/entities/user.entity';

@Entity('document_versions')
export class DocumentVersion {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Document)
  @JoinColumn({ name: 'document_id' })
  document!: Document;

  @Column({ name: 'document_id', type: 'uuid' })
  documentId!: string;

  @Column({ name: 'version_number' })
  versionNumber!: number;

  @Column({ name: 'filename_original', type: 'varchar' })
  filenameOriginal!: string;

  @Column({ name: 'filename_stored', type: 'varchar' })
  filenameStored!: string;

  @Column({ name: 'storage_path', type: 'varchar' })
  storagePath!: string;

  @Column({ name: 'mime_type', type: 'varchar' })
  mimeType!: string;

  @Column({ name: 'size_bytes', type: 'bigint' })
  sizeBytes!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'uploaded_by_id' })
  uploadedBy!: User;

  @Column({ name: 'uploaded_by_id', type: 'uuid' })
  uploadedById!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
