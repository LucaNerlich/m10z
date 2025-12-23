-- 1) Create database
CREATE DATABASE m10z;

-- 2) Create application role/user
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'm10z_user') THEN
CREATE ROLE m10z_user WITH LOGIN PASSWORD 'm10z_password' CREATEDB;
END IF;
END$$;

-- 3) Grant privileges on the database
GRANT ALL PRIVILEGES ON DATABASE m10z TO m10z_user;

-- 5) Ensure public schema privileges for the new DB
-- Run these in the context of the target DB
\connect m10z

-- Make sure the user can use/create in public schema (avoid "permission denied for schema public")
GRANT USAGE ON SCHEMA public TO m10z_user;
GRANT CREATE ON SCHEMA public TO m10z_user;

-- Optional: grant all on existing objects (if any) and set defaults for future objects
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO m10z_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO m10z_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO m10z_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO m10z_user;

-- 6) If superuser is needed (e.g., migrations), uncomment:
ALTER ROLE m10z_user WITH SUPERUSER
