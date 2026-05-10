import { cleanupUsers } from './setup';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import * as argon2 from 'argon2';
import { GlobalExceptionFilter } from '../src/common/filters/http-exception.filter';

/**
 * NOTE: The tamper test requires ALTER TABLE privileges to disable/enable the
 * audit_log immutability trigger. The app's DataSource connects as bnr_app,
 * which is a restricted role and does NOT have this privilege.
 *
 * To run the trigger-disable portion, set DATABASE_OWNER_URL in your environment
 * pointing at the same Postgres instance with the owner/superuser role, e.g.:
 *   DATABASE_OWNER_URL=postgres://bnr_owner:secret@localhost:5432/bnr_licensing
 *
 * If DATABASE_OWNER_URL is not set, the trigger-disable test will be skipped with
 * a warning. The first test (verify before tampering) always runs via bnr_app DS.
 */

describe('Audit log tamper detection (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let adminToken: string;
  let applicantToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalFilters(new GlobalExceptionFilter());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    dataSource = moduleFixture.get(DataSource);
    await cleanupUsers(dataSource, '%@tamper.test');
    const hash = await argon2.hash('Password1!', { type: argon2.argon2id });
    await dataSource.query(`
      INSERT INTO users (id, email, password_hash, role, is_active) VALUES
        (gen_random_uuid(), 'admin@tamper.test', $1, 'ADMIN', true),
        (gen_random_uuid(), 'applicant@tamper.test', $1, 'APPLICANT', true)
    `, [hash]);

    const loginAdmin = await request(app.getHttpServer()).post('/api/v1/auth/login')
      .send({ email: 'admin@tamper.test', password: 'Password1!' });
    adminToken = loginAdmin.body.accessToken;

    const loginApplicant = await request(app.getHttpServer()).post('/api/v1/auth/login')
      .send({ email: 'applicant@tamper.test', password: 'Password1!' });
    applicantToken = loginApplicant.body.accessToken;
  });

  afterAll(async () => {
    await cleanupUsers(dataSource, '%@tamper.test');
    await app.close();
  });

  it('audit verify returns valid before any tampering', async () => {
    // Generate an audit entry by creating an application
    await request(app.getHttpServer())
      .post('/api/v1/applications')
      .set('Authorization', `Bearer ${applicantToken}`)
      .send({ bankName: 'Tamper Test Bank', licenceType: 'COMMERCIAL_BANK', capitalAmount: 1000000 });

    const res = await request(app.getHttpServer())
      .get('/api/v1/audit/verify')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
  });

  it('direct DB row_hash mutation is detected by verify', async () => {
    // This test requires DATABASE_OWNER_URL env var for ALTER TABLE privilege.
    // The app DataSource (bnr_app role) cannot disable triggers; only the DB owner can.
    if (!process.env.DATABASE_OWNER_URL) {
      console.warn(
        'Skipping tamper test: DATABASE_OWNER_URL not set. ' +
        'Set it to a connection string with owner/superuser privileges to enable trigger disable/enable.',
      );
      return;
    }

    // Get an audit row
    const rows = await dataSource.query(
      `SELECT id FROM audit_log ORDER BY occurred_at ASC LIMIT 1`,
    );
    if (rows.length === 0) {
      console.warn('No audit rows — skipping tamper test');
      return;
    }
    const rowId = rows[0].id;

    // Connect as DB owner to disable the immutability trigger, mutate a row, re-enable.
    // We use a fresh DataSource with the owner credentials for these privileged ops.
    const { DataSource: DS } = await import('typeorm');
    const ownerDs = new DS({
      type: 'postgres',
      url: process.env.DATABASE_OWNER_URL,
      synchronize: false,
    });
    await ownerDs.initialize();

    try {
      await ownerDs.query(`ALTER TABLE audit_log DISABLE TRIGGER trg_audit_log_immutable`);
      await ownerDs.query(
        `UPDATE audit_log SET action = 'TAMPERED' WHERE id = $1`,
        [rowId],
      );
      await ownerDs.query(`ALTER TABLE audit_log ENABLE TRIGGER trg_audit_log_immutable`);
    } finally {
      await ownerDs.destroy();
    }

    // Verify now detects the break
    const res = await request(app.getHttpServer())
      .get('/api/v1/audit/verify')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(false);
    expect(res.body.firstBrokenRowId).toBe(rowId);
  });
});
