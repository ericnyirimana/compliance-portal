import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1700000001 implements MigrationInterface {
  name = 'InitialSchema1700000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Users
    await queryRunner.query(`
      CREATE TYPE user_role AS ENUM ('APPLICANT', 'REVIEWER', 'DECISION_MAKER', 'ADMIN')
    `);

    await queryRunner.query(`
      CREATE TABLE users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role user_role NOT NULL DEFAULT 'APPLICANT',
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Refresh tokens
    await queryRunner.query(`
      CREATE TABLE refresh_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id)`);
    await queryRunner.query(`CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens(token_hash)`);

    // Applications
    await queryRunner.query(`
      CREATE TYPE application_status AS ENUM (
        'DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'RETURNED_FOR_INFO',
        'PENDING_DECISION', 'APPROVED', 'REJECTED'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE licence_type AS ENUM (
        'COMMERCIAL_BANK', 'MICROFINANCE', 'FOREX_BUREAU', 'PAYMENT_INSTITUTION'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE applications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        applicant_id UUID NOT NULL REFERENCES users(id),
        bank_name VARCHAR(255) NOT NULL,
        licence_type licence_type NOT NULL,
        capital_amount BIGINT NOT NULL,
        address TEXT,
        status application_status NOT NULL DEFAULT 'DRAFT',
        version INTEGER NOT NULL DEFAULT 0,
        reviewer_id UUID REFERENCES users(id),
        decision_maker_id UUID REFERENCES users(id),
        decision_notes TEXT,
        submitted_at TIMESTAMPTZ,
        decided_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_applications_applicant_id ON applications(applicant_id)`);
    await queryRunner.query(`CREATE INDEX idx_applications_status ON applications(status)`);

    // Reviews
    await queryRunner.query(`
      CREATE TYPE review_action AS ENUM (
        'PICKED_UP', 'REQUESTED_INFO', 'RECOMMENDED_APPROVE', 'RECOMMENDED_REJECT', 'NOTE'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE reviews (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        application_id UUID NOT NULL REFERENCES applications(id),
        reviewer_id UUID NOT NULL REFERENCES users(id),
        action review_action NOT NULL,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_reviews_application_id ON reviews(application_id)`);

    // Documents
    await queryRunner.query(`
      CREATE TABLE documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        application_id UUID NOT NULL REFERENCES applications(id),
        slot VARCHAR(100) NOT NULL,
        current_version_number INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(application_id, slot)
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_documents_application_id ON documents(application_id)`);

    // Document versions
    await queryRunner.query(`
      CREATE TABLE document_versions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        document_id UUID NOT NULL REFERENCES documents(id),
        version_number INTEGER NOT NULL,
        filename_original VARCHAR(500) NOT NULL,
        filename_stored VARCHAR(500) NOT NULL,
        storage_path TEXT NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        size_bytes BIGINT NOT NULL,
        uploaded_by_id UUID NOT NULL REFERENCES users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(document_id, version_number)
      )
    `);

    // Audit log — with hash chain columns
    await queryRunner.query(`
      CREATE TABLE audit_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        actor_user_id UUID,
        action VARCHAR(100) NOT NULL,
        application_id UUID,
        state_before VARCHAR(50),
        state_after VARCHAR(50),
        payload JSONB,
        occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        request_id VARCHAR(100),
        ip VARCHAR(45),
        prev_hash CHAR(64) NOT NULL,
        row_hash CHAR(64) NOT NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_audit_log_application_id ON audit_log(application_id)`);
    await queryRunner.query(`CREATE INDEX idx_audit_log_actor_user_id ON audit_log(actor_user_id)`);
    await queryRunner.query(`CREATE INDEX idx_audit_log_occurred_at ON audit_log(occurred_at)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS audit_log`);
    await queryRunner.query(`DROP TABLE IF EXISTS document_versions`);
    await queryRunner.query(`DROP TABLE IF EXISTS documents`);
    await queryRunner.query(`DROP TABLE IF EXISTS reviews`);
    await queryRunner.query(`DROP TYPE IF EXISTS review_action`);
    await queryRunner.query(`DROP TABLE IF EXISTS applications`);
    await queryRunner.query(`DROP TYPE IF EXISTS application_status`);
    await queryRunner.query(`DROP TYPE IF EXISTS licence_type`);
    await queryRunner.query(`DROP TABLE IF EXISTS refresh_tokens`);
    await queryRunner.query(`DROP TABLE IF EXISTS users`);
    await queryRunner.query(`DROP TYPE IF EXISTS user_role`);
  }
}
