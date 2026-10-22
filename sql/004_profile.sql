ALTER TABLE app_user ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE app_user ADD COLUMN IF NOT EXISTS username TEXT;

UPDATE app_user
SET email = name
WHERE email IS NULL AND position('@' in name) > 0;

CREATE UNIQUE INDEX IF NOT EXISTS app_user_email_lower ON app_user (lower(email)) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS app_user_username_lower ON app_user (lower(username)) WHERE username IS NOT NULL;
