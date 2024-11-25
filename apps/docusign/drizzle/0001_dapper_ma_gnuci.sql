ALTER TABLE "organisations" DROP COLUMN IF EXISTS "access_token";
ALTER TABLE "organisations" DROP COLUMN IF EXISTS "refresh_token";
ALTER TABLE "organisations" DROP COLUMN IF EXISTS "account_id";
ALTER TABLE "organisations" DROP COLUMN IF EXISTS "auth_user_id";
ALTER TABLE "organisations" DROP COLUMN IF EXISTS "api_base_uri";