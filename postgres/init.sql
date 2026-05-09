-- Create application role with limited privileges.
-- bnr_owner is the superuser role used only for migrations (DDL).
-- bnr_app is the role the NestJS app connects as at runtime.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'bnr_app') THEN
    CREATE ROLE bnr_app WITH LOGIN PASSWORD 'changeme_app';
  END IF;
END
$$;

-- bnr_owner already exists (it's the POSTGRES_USER).
-- Grant bnr_app connect rights on the database.
GRANT CONNECT ON DATABASE bnr_licensing TO bnr_app;

-- Schema usage — migrations will run specific table-level grants after creating tables.
GRANT USAGE ON SCHEMA public TO bnr_app;
