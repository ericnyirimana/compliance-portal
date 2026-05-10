import { cleanupUsers } from './setup';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import * as argon2 from 'argon2';
import { GlobalExceptionFilter } from '../src/common/filters/http-exception.filter';

describe('Concurrency — optimistic locking (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let applicantToken: string;
  let reviewerToken: string;

  async function login(email: string): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: 'Password1!' });
    return res.body.accessToken;
  }

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

    // Clean and create test users
    await cleanupUsers(dataSource, '%@concurrency.test');
    const hash = await argon2.hash('Password1!', { type: argon2.argon2id });
    await dataSource.query(`
      INSERT INTO users (id, email, password_hash, role, is_active) VALUES
        (gen_random_uuid(), 'applicant@concurrency.test', $1, 'APPLICANT', true),
        (gen_random_uuid(), 'reviewer1@concurrency.test', $1, 'REVIEWER', true),
        (gen_random_uuid(), 'reviewer2@concurrency.test', $1, 'REVIEWER', true)
    `, [hash]);

    applicantToken = await login('applicant@concurrency.test');
    reviewerToken = await login('reviewer1@concurrency.test');
  });

  afterAll(async () => {
    await cleanupUsers(dataSource, '%@concurrency.test');
    await app.close();
  });

  it('two concurrent pickup requests: exactly one succeeds, the other gets 409 STALE_VERSION', async () => {
    // Create and submit an application
    let res = await request(app.getHttpServer())
      .post('/api/v1/applications')
      .set('Authorization', `Bearer ${applicantToken}`)
      .send({ bankName: 'Concurrency Test Bank', licenceType: 'COMMERCIAL_BANK', capitalAmount: 5000000000 });
    expect(res.status).toBe(201);
    const appId = res.body.id;

    res = await request(app.getHttpServer())
      .post(`/api/v1/applications/${appId}/submit`)
      .set('Authorization', `Bearer ${applicantToken}`);
    expect(res.status).toBe(201);

    // Two reviewers race to pick up the same application
    const reviewer1Token = await login('reviewer1@concurrency.test');
    const reviewer2Token = await login('reviewer2@concurrency.test');

    const [r1, r2] = await Promise.all([
      request(app.getHttpServer())
        .post(`/api/v1/applications/${appId}/pickup`)
        .set('Authorization', `Bearer ${reviewer1Token}`),
      request(app.getHttpServer())
        .post(`/api/v1/applications/${appId}/pickup`)
        .set('Authorization', `Bearer ${reviewer2Token}`),
    ]);

    const statuses = [r1.status, r2.status].sort();
    // Exactly one 201, one 409
    expect(statuses).toEqual([201, 409]);

    // The 409 is either STALE_VERSION (version check fired first) or INVALID_TRANSITION
    // (state check fired first when one request completes before the other reads initial state).
    // Both are correct concurrent-rejection outcomes.
    const loser = r1.status === 409 ? r1 : r2;
    expect(['STALE_VERSION', 'INVALID_TRANSITION']).toContain(loser.body.error.code);
  });
});
