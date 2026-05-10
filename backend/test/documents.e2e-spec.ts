import { cleanupUsers } from './setup';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import * as argon2 from 'argon2';
import { GlobalExceptionFilter } from '../src/common/filters/http-exception.filter';

describe('Document uploads (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let applicantToken: string;
  let appId: string;

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
    await cleanupUsers(dataSource, '%@docs.test');
    const hash = await argon2.hash('Password1!', { type: argon2.argon2id });
    await dataSource.query(`
      INSERT INTO users (id, email, password_hash, role, is_active) VALUES
        (gen_random_uuid(), 'applicant@docs.test', $1, 'APPLICANT', true)
    `, [hash]);

    const res = await request(app.getHttpServer()).post('/api/v1/auth/login')
      .send({ email: 'applicant@docs.test', password: 'Password1!' });
    applicantToken = res.body.accessToken;

    // Create application
    const appRes = await request(app.getHttpServer())
      .post('/api/v1/applications')
      .set('Authorization', `Bearer ${applicantToken}`)
      .send({ bankName: 'Docs Test Bank', licenceType: 'COMMERCIAL_BANK', capitalAmount: 1000000 });
    appId = appRes.body.id;
  });

  afterAll(async () => {
    await cleanupUsers(dataSource, '%@docs.test');
    await app.close();
  });

  it('rejects file larger than 5MB', async () => {
    const sixMB = Buffer.alloc(6 * 1024 * 1024 + 1, 0);
    // Prepend PDF magic bytes so it passes MIME check if it gets that far
    sixMB[0] = 0x25; sixMB[1] = 0x50; sixMB[2] = 0x44; sixMB[3] = 0x46;

    const res = await request(app.getHttpServer())
      .post(`/api/v1/applications/${appId}/documents/test-slot`)
      .set('Authorization', `Bearer ${applicantToken}`)
      .attach('file', sixMB, { filename: 'big.pdf', contentType: 'application/pdf' });

    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('FILE_TOO_LARGE');
  });

  it('rejects executable renamed to .pdf (MIME sniff)', async () => {
    // Windows PE magic bytes (MZ header)
    const fakeExe = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]);

    const res = await request(app.getHttpServer())
      .post(`/api/v1/applications/${appId}/documents/test-slot`)
      .set('Authorization', `Bearer ${applicantToken}`)
      .attach('file', fakeExe, { filename: 'virus.pdf', contentType: 'application/pdf' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_MIME_TYPE');
  });

  it('accepts a valid PDF', async () => {
    // Minimal valid PDF
    const pdf = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF');

    const res = await request(app.getHttpServer())
      .post(`/api/v1/applications/${appId}/documents/incorporation_cert`)
      .set('Authorization', `Bearer ${applicantToken}`)
      .attach('file', pdf, { filename: 'cert.pdf', contentType: 'application/pdf' });

    expect([201, 200]).toContain(res.status);
    expect(res.body).toHaveProperty('id');
    expect(res.body.versionNumber).toBe(1);
  });

  it('versioning: uploading to same slot creates version 2', async () => {
    const pdf = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF');

    const res = await request(app.getHttpServer())
      .post(`/api/v1/applications/${appId}/documents/incorporation_cert`)
      .set('Authorization', `Bearer ${applicantToken}`)
      .attach('file', pdf, { filename: 'cert_v2.pdf', contentType: 'application/pdf' });

    expect([201, 200]).toContain(res.status);
    expect(res.body.versionNumber).toBe(2);
  });
});
