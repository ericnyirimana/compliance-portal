import 'reflect-metadata';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../../../../', '.env') });

import { AppDataSource } from '../data-source';
import { User, UserRole } from '../../modules/users/entities/user.entity';
import { Application, ApplicationStatus, LicenceType } from '../../modules/applications/entities/application.entity';
import { Review, ReviewAction } from '../../modules/applications/entities/review.entity';
import { Document } from '../../modules/documents/entities/document.entity';
import { DocumentVersion } from '../../modules/documents/entities/document-version.entity';
import { AuditLog } from '../../modules/audit/entities/audit-log.entity';

function sha256(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function canonicalJson(obj: Record<string, unknown>): string {
  return JSON.stringify(obj, Object.keys(obj).sort());
}

function computeRowHash(prevHash: string, entry: Record<string, unknown>): string {
  const canonical = canonicalJson(entry);
  return sha256(prevHash + canonical);
}

async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id });
}

async function main() {
  console.log('Connecting to database...');
  await AppDataSource.initialize();
  console.log('Connected.');

  const userRepo = AppDataSource.getRepository(User);
  const appRepo = AppDataSource.getRepository(Application);
  const reviewRepo = AppDataSource.getRepository(Review);
  const docRepo = AppDataSource.getRepository(Document);
  const docVersionRepo = AppDataSource.getRepository(DocumentVersion);
  const auditRepo = AppDataSource.getRepository(AuditLog);

  // Check if already seeded
  const existingUsers = await userRepo.count();
  if (existingUsers > 0) {
    console.log('Database already seeded. Skipping.');
    await AppDataSource.destroy();
    return;
  }

  console.log('Seeding users...');
  const password = 'Password1!';

  const alice = userRepo.create({
    email: 'alice@bnr.test',
    passwordHash: await hashPassword(password),
    role: UserRole.APPLICANT,
    isActive: true,
  });

  const bob = userRepo.create({
    email: 'bob@bnr.test',
    passwordHash: await hashPassword(password),
    role: UserRole.REVIEWER,
    isActive: true,
  });

  const carol = userRepo.create({
    email: 'carol@bnr.test',
    passwordHash: await hashPassword(password),
    role: UserRole.DECISION_MAKER,
    isActive: true,
  });

  const dave = userRepo.create({
    email: 'dave@bnr.test',
    passwordHash: await hashPassword(password),
    role: UserRole.ADMIN,
    isActive: true,
  });

  await userRepo.save([alice, bob, carol, dave]);
  console.log('Users created:', alice.email, bob.email, carol.email, dave.email);

  // ── Application A: UNDER_REVIEW with documents and review history ─────────
  console.log('Seeding Application A (UNDER_REVIEW)...');
  const appA = appRepo.create({
    applicantId: alice.id,
    bankName: 'Kigali Commercial Bank Ltd',
    licenceType: LicenceType.COMMERCIAL_BANK,
    capitalAmount: '5000000000',
    address: 'KG 1 Ave, Kigali, Rwanda',
    status: ApplicationStatus.UNDER_REVIEW,
    reviewerId: bob.id,
    submittedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    version: 2,
  });
  await appRepo.save(appA);

  // Review row for appA
  const reviewA = reviewRepo.create({
    applicationId: appA.id,
    reviewerId: bob.id,
    action: ReviewAction.PICKED_UP,
    notes: 'Application looks complete. Beginning review.',
  });
  await reviewRepo.save(reviewA);

  // Documents for appA — two slots, slot 'incorporation_certificate' has v1
  const docA1 = docRepo.create({
    applicationId: appA.id,
    slot: 'incorporation_certificate',
    currentVersionNumber: 1,
  });
  await docRepo.save(docA1);

  const docVersionA1 = docVersionRepo.create({
    documentId: docA1.id,
    versionNumber: 1,
    filenameOriginal: 'incorporation_certificate.pdf',
    filenameStored: `${uuidv4()}__incorporation_certificate.pdf`,
    storagePath: `${appA.id}/incorporation_certificate/1`,
    mimeType: 'application/pdf',
    sizeBytes: '204800',
    uploadedById: alice.id,
  });
  await docVersionRepo.save(docVersionA1);

  const docA2 = docRepo.create({
    applicationId: appA.id,
    slot: 'business_plan',
    currentVersionNumber: 2,
  });
  await docRepo.save(docA2);

  const docVersionA2v1 = docVersionRepo.create({
    documentId: docA2.id,
    versionNumber: 1,
    filenameOriginal: 'business_plan_v1.pdf',
    filenameStored: `${uuidv4()}__business_plan_v1.pdf`,
    storagePath: `${appA.id}/business_plan/1`,
    mimeType: 'application/pdf',
    sizeBytes: '512000',
    uploadedById: alice.id,
  });

  const docVersionA2v2 = docVersionRepo.create({
    documentId: docA2.id,
    versionNumber: 2,
    filenameOriginal: 'business_plan_v2.pdf',
    filenameStored: `${uuidv4()}__business_plan_v2.pdf`,
    storagePath: `${appA.id}/business_plan/2`,
    mimeType: 'application/pdf',
    sizeBytes: '614400',
    uploadedById: alice.id,
  });
  await docVersionRepo.save([docVersionA2v1, docVersionA2v2]);

  // ── Application B: APPROVED with full audit trail ─────────────────────────
  console.log('Seeding Application B (APPROVED)...');
  const appB = appRepo.create({
    applicantId: alice.id,
    bankName: 'Rwanda Microfinance Services',
    licenceType: LicenceType.MICROFINANCE,
    capitalAmount: '500000000',
    address: 'KN 5 Rd, Kigali, Rwanda',
    status: ApplicationStatus.APPROVED,
    reviewerId: bob.id,
    decisionMakerId: carol.id,
    decisionNotes: 'All requirements met. Capital adequacy confirmed. Licence approved.',
    submittedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    decidedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    version: 4,
  });
  await appRepo.save(appB);

  // Review for appB
  const reviewB1 = reviewRepo.create({
    applicationId: appB.id,
    reviewerId: bob.id,
    action: ReviewAction.PICKED_UP,
    notes: 'Picked up for review.',
  });
  const reviewB2 = reviewRepo.create({
    applicationId: appB.id,
    reviewerId: bob.id,
    action: ReviewAction.RECOMMENDED_APPROVE,
    notes: 'All documents verified. Capital meets minimum threshold. Recommend approval.',
  });
  await reviewRepo.save([reviewB1, reviewB2]);

  // ── Audit log — hash chain for both applications ───────────────────────────
  console.log('Seeding audit log...');

  const ZERO_HASH = '0'.repeat(64);
  let prevHash = ZERO_HASH;

  const auditEntries = [
    {
      actorUserId: alice.id,
      action: 'APPLICATION_CREATED',
      applicationId: appB.id,
      stateBefore: null,
      stateAfter: ApplicationStatus.DRAFT,
      payload: { bankName: appB.bankName },
      occurredAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      requestId: uuidv4(),
      ip: '127.0.0.1',
    },
    {
      actorUserId: alice.id,
      action: 'APPLICATION_SUBMITTED',
      applicationId: appB.id,
      stateBefore: ApplicationStatus.DRAFT,
      stateAfter: ApplicationStatus.SUBMITTED,
      payload: {},
      occurredAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      requestId: uuidv4(),
      ip: '127.0.0.1',
    },
    {
      actorUserId: bob.id,
      action: 'APPLICATION_PICKED_UP',
      applicationId: appB.id,
      stateBefore: ApplicationStatus.SUBMITTED,
      stateAfter: ApplicationStatus.UNDER_REVIEW,
      payload: {},
      occurredAt: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000),
      requestId: uuidv4(),
      ip: '10.0.0.1',
    },
    {
      actorUserId: bob.id,
      action: 'APPLICATION_RECOMMENDED',
      applicationId: appB.id,
      stateBefore: ApplicationStatus.UNDER_REVIEW,
      stateAfter: ApplicationStatus.PENDING_DECISION,
      payload: { recommendation: 'APPROVE' },
      occurredAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      requestId: uuidv4(),
      ip: '10.0.0.1',
    },
    {
      actorUserId: carol.id,
      action: 'APPLICATION_APPROVED',
      applicationId: appB.id,
      stateBefore: ApplicationStatus.PENDING_DECISION,
      stateAfter: ApplicationStatus.APPROVED,
      payload: { notes: appB.decisionNotes },
      occurredAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      requestId: uuidv4(),
      ip: '10.0.0.2',
    },
    {
      actorUserId: alice.id,
      action: 'APPLICATION_CREATED',
      applicationId: appA.id,
      stateBefore: null,
      stateAfter: ApplicationStatus.DRAFT,
      payload: { bankName: appA.bankName },
      occurredAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      requestId: uuidv4(),
      ip: '127.0.0.1',
    },
    {
      actorUserId: alice.id,
      action: 'APPLICATION_SUBMITTED',
      applicationId: appA.id,
      stateBefore: ApplicationStatus.DRAFT,
      stateAfter: ApplicationStatus.SUBMITTED,
      payload: {},
      occurredAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      requestId: uuidv4(),
      ip: '127.0.0.1',
    },
    {
      actorUserId: bob.id,
      action: 'APPLICATION_PICKED_UP',
      applicationId: appA.id,
      stateBefore: ApplicationStatus.SUBMITTED,
      stateAfter: ApplicationStatus.UNDER_REVIEW,
      payload: {},
      occurredAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      requestId: uuidv4(),
      ip: '10.0.0.1',
    },
  ];

  for (const entry of auditEntries) {
    const entryWithoutHashes = {
      actorUserId: entry.actorUserId,
      action: entry.action,
      applicationId: entry.applicationId,
      stateBefore: entry.stateBefore,
      stateAfter: entry.stateAfter,
      payload: entry.payload,
      occurredAt: entry.occurredAt.toISOString(),
      requestId: entry.requestId,
      ip: entry.ip,
    };
    const rowHash = computeRowHash(prevHash, entryWithoutHashes as Record<string, unknown>);

    const auditRow = auditRepo.create({
      ...entry,
      stateBefore: entry.stateBefore ?? undefined,
      prevHash,
      rowHash,
    });
    await auditRepo.save(auditRow);
    prevHash = rowHash;
  }

  console.log('Audit log entries created:', auditEntries.length);
  console.log('Seed complete.');
  await AppDataSource.destroy();
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
