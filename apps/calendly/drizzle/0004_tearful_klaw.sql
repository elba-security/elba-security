ALTER TABLE "organisations" DROP COLUMN IF EXISTS "access_token";
ALTER TABLE "organisations" DROP COLUMN IF EXISTS "refresh_token";
ALTER TABLE "organisations" DROP COLUMN IF EXISTS "organization_uri";
ALTER TABLE "organisations" DROP COLUMN IF EXISTS "auth_user_uri";