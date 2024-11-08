ALTER TABLE "organisations" DROP COLUMN IF EXISTS "access_token";--> statement-breakpoint
ALTER TABLE "organisations" DROP COLUMN IF EXISTS "refresh_token";--> statement-breakpoint
ALTER TABLE "organisations" DROP COLUMN IF EXISTS "account_id";--> statement-breakpoint
ALTER TABLE "organisations" DROP COLUMN IF EXISTS "auth_user_id";--> statement-breakpoint
ALTER TABLE "organisations" DROP COLUMN IF EXISTS "api_base_uri";