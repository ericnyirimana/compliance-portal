import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('audit_log')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'actor_user_id', nullable: true })
  actorUserId: string;

  @Column()
  action: string;

  @Column({ name: 'application_id', nullable: true })
  applicationId: string;

  @Column({ name: 'state_before', nullable: true })
  stateBefore: string;

  @Column({ name: 'state_after', nullable: true })
  stateAfter: string;

  @Column({ type: 'jsonb', nullable: true })
  payload: Record<string, unknown>;

  @Column({ name: 'occurred_at', type: 'timestamptz' })
  occurredAt: Date;

  @Column({ name: 'request_id', nullable: true })
  requestId: string;

  @Column({ nullable: true })
  ip: string;

  @Column({ name: 'prev_hash' })
  prevHash: string;

  @Column({ name: 'row_hash' })
  rowHash: string;
}
