import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Application } from '../../applications/entities/application.entity';

@Entity('documents')
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Application)
  @JoinColumn({ name: 'application_id' })
  application!: Application;

  @Column({ name: 'application_id', type: 'uuid' })
  applicationId!: string;

  @Column({ type: 'varchar' })
  slot!: string;

  @Column({ name: 'current_version_number', default: 0 })
  currentVersionNumber!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
