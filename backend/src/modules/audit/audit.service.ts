import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, QueryRunner, Repository } from 'typeorm';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { AuditLog } from './entities/audit-log.entity';

export interface AuditContext {
  actorUserId?: string;
  action: string;
  applicationId?: string;
  stateBefore?: string;
  stateAfter?: string;
  payload?: Record<string, unknown>;
  requestId?: string;
  ip?: string;
}

export interface AuditVerifyResult {
  valid: boolean;
  totalRows: number;
  firstBrokenRowId?: string;
  firstBrokenPosition?: number;
}

@Injectable()
export class AuditService {
  private readonly ZERO_HASH = '0'.repeat(64);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Write one audit entry. Must be called within the same transaction as the
   * audited business action. Accepts an optional external QueryRunner so that
   * callers can include the audit write in their own transaction.
   *
   * If no QueryRunner is provided, a new transaction is opened for the audit
   * write alone (suitable when the business action was committed elsewhere,
   * e.g. seed or test setup).
   */
  async write(ctx: AuditContext, externalQr?: QueryRunner): Promise<AuditLog> {
    const ownQr = !externalQr;
    const qr = externalQr ?? this.dataSource.createQueryRunner();

    if (ownQr) {
      await qr.connect();
      await qr.startTransaction();
    }

    try {
      // Lock the tail row to serialise concurrent appends
      const tailRows: { row_hash: string }[] = await qr.query(
        `SELECT row_hash FROM audit_log ORDER BY occurred_at DESC, id DESC LIMIT 1 FOR UPDATE`,
      );
      const prevHash = tailRows.length > 0 ? tailRows[0].row_hash : this.ZERO_HASH;

      const occurredAt = new Date();
      const entryForHash = {
        actorUserId: ctx.actorUserId ?? null,
        action: ctx.action,
        applicationId: ctx.applicationId ?? null,
        stateBefore: ctx.stateBefore ?? null,
        stateAfter: ctx.stateAfter ?? null,
        payload: ctx.payload ?? null,
        occurredAt: occurredAt.toISOString(),
        requestId: ctx.requestId ?? null,
        ip: ctx.ip ?? null,
      };

      const rowHash = this.computeHash(prevHash, entryForHash);

      const id = uuidv4();
      await qr.query(
        `INSERT INTO audit_log
          (id, actor_user_id, action, application_id, state_before, state_after,
           payload, occurred_at, request_id, ip, prev_hash, row_hash)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          id,
          ctx.actorUserId ?? null,
          ctx.action,
          ctx.applicationId ?? null,
          ctx.stateBefore ?? null,
          ctx.stateAfter ?? null,
          ctx.payload ? JSON.stringify(ctx.payload) : null,
          occurredAt.toISOString(),
          ctx.requestId ?? null,
          ctx.ip ?? null,
          prevHash,
          rowHash,
        ],
      );

      if (ownQr) await qr.commitTransaction();

      return {
        id,
        actorUserId: ctx.actorUserId ?? null,
        action: ctx.action,
        applicationId: ctx.applicationId ?? null,
        stateBefore: ctx.stateBefore ?? null,
        stateAfter: ctx.stateAfter ?? null,
        payload: ctx.payload ?? null,
        occurredAt,
        requestId: ctx.requestId ?? null,
        ip: ctx.ip ?? null,
        prevHash,
        rowHash,
      } as unknown as AuditLog;
    } catch (err) {
      if (ownQr) await qr.rollbackTransaction();
      throw err;
    } finally {
      if (ownQr) await qr.release();
    }
  }

  async findByApplication(
    applicationId: string,
    limit = 50,
    offset = 0,
  ): Promise<[AuditLog[], number]> {
    return this.auditRepo.findAndCount({
      where: { applicationId },
      order: { occurredAt: 'ASC' },
      take: limit,
      skip: offset,
    });
  }

  async findAll(limit = 100, offset = 0): Promise<[AuditLog[], number]> {
    return this.auditRepo.findAndCount({
      order: { occurredAt: 'ASC' },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Walk the entire audit log in chronological order and verify the hash chain.
   * Returns the first broken entry.
   *
   * O(n) — add cursor-based pagination for production scale.
   */
  async verify(): Promise<AuditVerifyResult> {
    const rows = await this.auditRepo.find({
      order: { occurredAt: 'ASC', id: 'ASC' },
    });

    if (rows.length === 0) {
      return { valid: true, totalRows: 0 };
    }

    let prevHash = this.ZERO_HASH;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      const entryForHash = {
        actorUserId: row.actorUserId ?? null,
        action: row.action,
        applicationId: row.applicationId ?? null,
        stateBefore: row.stateBefore ?? null,
        stateAfter: row.stateAfter ?? null,
        payload: row.payload ?? null,
        occurredAt: row.occurredAt.toISOString(),
        requestId: row.requestId ?? null,
        ip: row.ip ?? null,
      };

      const expectedRowHash = this.computeHash(prevHash, entryForHash);

      if (row.prevHash !== prevHash) {
        return {
          valid: false,
          totalRows: rows.length,
          firstBrokenRowId: row.id,
          firstBrokenPosition: i,
        };
      }

      if (row.rowHash !== expectedRowHash) {
        return {
          valid: false,
          totalRows: rows.length,
          firstBrokenRowId: row.id,
          firstBrokenPosition: i,
        };
      }

      prevHash = row.rowHash;
    }

    return { valid: true, totalRows: rows.length };
  }

  private computeHash(prevHash: string, entry: Record<string, unknown>): string {
    const canonical = JSON.stringify(entry, Object.keys(entry).sort());
    return crypto.createHash('sha256').update(prevHash + canonical).digest('hex');
  }
}
