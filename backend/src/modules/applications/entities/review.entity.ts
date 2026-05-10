import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Application } from './application.entity';
import { User } from '../../users/entities/user.entity';

export enum ReviewAction {
  PICKED_UP = 'PICKED_UP',
  REQUESTED_INFO = 'REQUESTED_INFO',
  RECOMMENDED_APPROVE = 'RECOMMENDED_APPROVE',
  RECOMMENDED_REJECT = 'RECOMMENDED_REJECT',
  NOTE = 'NOTE',
}

@Entity('reviews')
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Application)
  @JoinColumn({ name: 'application_id' })
  application!: Application;

  @Column({ name: 'application_id', type: 'uuid' })
  applicationId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'reviewer_id' })
  reviewer!: User;

  @Column({ name: 'reviewer_id', type: 'uuid' })
  reviewerId!: string;

  @Column({ type: 'enum', enum: ReviewAction })
  action!: ReviewAction;

  @Column({ nullable: true, type: 'text' })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
