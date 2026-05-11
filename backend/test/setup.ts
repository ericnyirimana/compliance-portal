import * as path from 'path';
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

/** Delete all test data for a given email domain in FK-safe order. */
export async function cleanupUsers(ds: DataSource, domain: string): Promise<void> {
  const userIds = `SELECT id FROM users WHERE email LIKE '${domain}'`;
  const appIds  = `SELECT id FROM applications WHERE applicant_id IN (${userIds})`;
  await ds.query(`DELETE FROM document_versions WHERE uploaded_by_id IN (${userIds})`);
  await ds.query(`DELETE FROM document_versions WHERE document_id IN (SELECT id FROM documents WHERE application_id IN (${appIds}))`);
  await ds.query(`DELETE FROM documents WHERE application_id IN (${appIds})`);
  await ds.query(`DELETE FROM reviews WHERE reviewer_id IN (${userIds}) OR application_id IN (${appIds})`);

  // bnr_app has TRUNCATE revoked on audit_log (append-only enforcement).
  // Use a short-lived owner connection for this step.
  const ownerDs = new DataSource({ type: 'postgres', url: process.env.DATABASE_OWNER_URL });
  await ownerDs.initialize();
  try {
    await ownerDs.query(`TRUNCATE audit_log`);
  } finally {
    await ownerDs.destroy();
  }

  await ds.query(`DELETE FROM applications WHERE applicant_id IN (${userIds})`);
  await ds.query(`DELETE FROM refresh_tokens WHERE user_id IN (${userIds})`);
  await ds.query(`DELETE FROM users WHERE email LIKE '${domain}'`);
}
