import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum ApplicationStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  RETURNED_FOR_INFO = 'RETURNED_FOR_INFO',
  PENDING_DECISION = 'PENDING_DECISION',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum LicenceType {
  COMMERCIAL_BANK = 'COMMERCIAL_BANK',
  MICROFINANCE = 'MICROFINANCE',
  FOREX_BUREAU = 'FOREX_BUREAU',
  PAYMENT_INSTITUTION = 'PAYMENT_INSTITUTION',
}

@Entity('applications')
export class Application {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { eager: false })
  applicant: User;

  @Column({ name: 'applicant_id' })
  applicantId: string;

  @Column({ name: 'bank_name' })
  bankName: string;

  @Column({
    name: 'licence_type',
    type: 'enum',
    enum: LicenceType,
  })
  licenceType: LicenceType;

  @Column({ name: 'capital_amount', type: 'bigint' })
  capitalAmount: string;

  @Column({ nullable: true })
  address: string;

  @Column({
    type: 'enum',
    enum: ApplicationStatus,
    default: ApplicationStatus.DRAFT,
  })
  status: ApplicationStatus;

  @VersionColumn()
  version: number;

  @Column({ name: 'reviewer_id', nullable: true })
  reviewerId: string;

  @Column({ name: 'decision_maker_id', nullable: true })
  decisionMakerId: string;

  @Column({ name: 'decision_notes', nullable: true, type: 'text' })
  decisionNotes: string;

  @Column({ name: 'submitted_at', nullable: true })
  submittedAt: Date;

  @Column({ name: 'decided_at', nullable: true })
  decidedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
