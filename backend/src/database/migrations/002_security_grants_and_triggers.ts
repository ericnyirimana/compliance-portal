import { MigrationInterface, QueryRunner } from 'typeorm';

export class SecurityGrantsAndTriggers1700000002000 implements MigrationInterface {
  name = 'SecurityGrantsAndTriggers1700000002000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── 0. Ensure bnr_app role exists (idempotent — safe for both Docker and local runs) ──
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'bnr_app') THEN
          CREATE ROLE bnr_app WITH LOGIN PASSWORD 'changeme_app';
        END IF;
      END
      $$
    `);
    await queryRunner.query(`DO $$ BEGIN EXECUTE format('GRANT CONNECT ON DATABASE %I TO bnr_app', current_database()); END $$`);
    await queryRunner.query(`GRANT USAGE ON SCHEMA public TO bnr_app`);

    // ── 1. Grant table-level privileges to bnr_app ─────────────────────────
    // Standard tables: SELECT, INSERT, UPDATE, DELETE
    const rw_tables = [
      'users', 'refresh_tokens', 'applications', 'reviews',
      'documents', 'document_versions',
    ];
    for (const t of rw_tables) {
      await queryRunner.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON ${t} TO bnr_app`);
    }

    // audit_log: INSERT and SELECT only — no UPDATE, DELETE, or TRUNCATE
    await queryRunner.query(`GRANT SELECT, INSERT ON audit_log TO bnr_app`);
    await queryRunner.query(`REVOKE UPDATE, DELETE, TRUNCATE ON audit_log FROM bnr_app`);

    // Grant usage on sequences
    await queryRunner.query(`GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO bnr_app`);

    // ── 2. Audit log append-only trigger ──────────────────────────────────
    // Belt-and-braces on top of the REVOKE: even a superuser connecting as
    // bnr_owner cannot slip an UPDATE/DELETE past this trigger without
    // explicitly dropping it first, making tampering visible in DDL history.
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION fn_audit_log_immutable()
      RETURNS TRIGGER LANGUAGE plpgsql AS $$
      BEGIN
        RAISE EXCEPTION 'audit_log rows are immutable: operation % on audit_log is forbidden', TG_OP;
      END;
      $$
    `);

    await queryRunner.query(`
      CREATE TRIGGER trg_audit_log_immutable
      BEFORE UPDATE OR DELETE ON audit_log
      FOR EACH ROW EXECUTE FUNCTION fn_audit_log_immutable()
    `);

    // ── 3. Terminal-state immutability trigger ─────────────────────────────
    // Prevents any UPDATE on an application whose status is APPROVED or REJECTED,
    // except for non-mutating fields (version, updated_at handled by ORM).
    // We block the transition at the service layer too; this is the DB belt.
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION fn_application_terminal_guard()
      RETURNS TRIGGER LANGUAGE plpgsql AS $$
      BEGIN
        IF OLD.status IN ('APPROVED', 'REJECTED') AND NEW.status != OLD.status THEN
          RAISE EXCEPTION 'application_terminal_state: application % is in a terminal state (%) and cannot be transitioned', OLD.id, OLD.status;
        END IF;
        IF OLD.status IN ('APPROVED', 'REJECTED')
           AND (NEW.bank_name != OLD.bank_name
             OR NEW.licence_type != OLD.licence_type
             OR NEW.capital_amount != OLD.capital_amount
             OR NEW.applicant_id != OLD.applicant_id) THEN
          RAISE EXCEPTION 'application_terminal_state: application % is in a terminal state and core fields cannot be modified', OLD.id;
        END IF;
        RETURN NEW;
      END;
      $$
    `);

    await queryRunner.query(`
      CREATE TRIGGER trg_application_terminal_guard
      BEFORE UPDATE ON applications
      FOR EACH ROW EXECUTE FUNCTION fn_application_terminal_guard()
    `);

    // ── 4. Reviewer ≠ Decision-maker DB trigger ────────────────────────────
    // When a decision_maker_id is set on an application, verify that user
    // has no rows in the reviews table for this application.
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION fn_reviewer_not_decision_maker()
      RETURNS TRIGGER LANGUAGE plpgsql AS $$
      DECLARE
        conflict_count INTEGER;
      BEGIN
        IF NEW.decision_maker_id IS NOT NULL THEN
          SELECT COUNT(*) INTO conflict_count
          FROM reviews
          WHERE application_id = NEW.id
            AND reviewer_id = NEW.decision_maker_id;

          IF conflict_count > 0 THEN
            RAISE EXCEPTION 'reviewer_is_decision_maker: user % reviewed application % and cannot be the decision maker', NEW.decision_maker_id, NEW.id;
          END IF;
        END IF;
        RETURN NEW;
      END;
      $$
    `);

    await queryRunner.query(`
      CREATE TRIGGER trg_reviewer_not_decision_maker
      BEFORE INSERT OR UPDATE ON applications
      FOR EACH ROW EXECUTE FUNCTION fn_reviewer_not_decision_maker()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_reviewer_not_decision_maker ON applications`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS fn_reviewer_not_decision_maker`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_application_terminal_guard ON applications`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS fn_application_terminal_guard`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_audit_log_immutable ON audit_log`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS fn_audit_log_immutable`);
    await queryRunner.query(`REVOKE ALL ON ALL TABLES IN SCHEMA public FROM bnr_app`);
  }
}
