-- ═══════════════════════════════════════════════════════════════
-- SQL Injection Security Story 6: Database Least Privilege
-- ═══════════════════════════════════════════════════════════════
-- Run this script as the PostgreSQL superuser (postgres) to create
-- a restricted application-level database user that can only
-- SELECT, INSERT, UPDATE, DELETE — NO DROP, ALTER, CREATE, TRUNCATE.
--
-- Usage: psql -U postgres -d petpulse_db -f create_app_user.sql
-- ═══════════════════════════════════════════════════════════════

-- Step 1: Create the restricted application user
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'petpulse_app') THEN
        CREATE ROLE petpulse_app WITH LOGIN PASSWORD 'secure_app_password_2026';
    END IF;
END
$$;

-- Step 2: Revoke all default privileges (clean slate)
REVOKE ALL ON DATABASE petpulse_db FROM petpulse_app;
REVOKE ALL ON SCHEMA public FROM petpulse_app;

-- Step 3: Grant schema usage (required to access tables)
GRANT CONNECT ON DATABASE petpulse_db TO petpulse_app;
GRANT USAGE ON SCHEMA public TO petpulse_app;

-- Step 4: Grant only DML operations (SELECT, INSERT, UPDATE, DELETE)
-- on ALL existing tables
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO petpulse_app;

-- Step 5: Grant sequence usage (required for auto-increment / RETURNING)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO petpulse_app;

-- Step 6: Set default privileges for FUTURE tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO petpulse_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO petpulse_app;

-- ═══════════════════════════════════════════════════════════════
-- Verification: Run these to confirm the user has NO admin privs
-- ═══════════════════════════════════════════════════════════════
-- \du petpulse_app
-- Should show: No superuser, no createdb, no createrole
--
-- Test that DROP is blocked:
-- SET ROLE petpulse_app;
-- DROP TABLE users;  -- Should fail with "permission denied"
-- RESET ROLE;
-- ═══════════════════════════════════════════════════════════════

-- After running this script, update your .env file:
-- POSTGRES_USER=petpulse_app
-- POSTGRES_PASSWORD=secure_app_password_2026
