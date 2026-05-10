import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('audit_log')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'actor_user_id', nullable: true, type: 'uuid' })
  actorUserId!: string | null;

  @Column({ type: 'varchar' })
  action!: string;

  @Column({ name: 'application_id', nullable: true, type: 'uuid' })
  applicationId!: string | null;

  @Column({ name: 'state_before', nullable: true, type: 'varchar' })
  stateBefore!: string | null;

  @Column({ name: 'state_after', nullable: true, type: 'varchar' })
  stateAfter!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  payload!: Record<string, unknown> | null;

  @Column({ name: 'occurred_at', type: 'timestamptz' })
  occurredAt!: Date;

  @Column({ name: 'request_id', nullable: true, type: 'varchar' })
  requestId!: string | null;

  @Column({ nullable: true, type: 'varchar' })
  ip!: string | null;

  @Column({ name: 'prev_hash', type: 'varchar' })
  prevHash!: string;

  @Column({ name: 'row_hash', type: 'varchar' })
  rowHash!: string;
}
