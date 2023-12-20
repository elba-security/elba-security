CREATE TABLE IF NOT EXISTS "organization" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"elba_organization_id" text NOT NULL,
	"tenant_id" text NOT NULL,
	CONSTRAINT "organization_elba_organization_id_unique" UNIQUE("elba_organization_id"),
	CONSTRAINT "organization_tenant_id_unique" UNIQUE("tenant_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "permission_grant" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"user_id" text NOT NULL,
	"app_id" text NOT NULL,
	"grant_id" text NOT NULL,
	CONSTRAINT "permission_grant_tenant_id_user_id_app_id_grant_id_unique" UNIQUE("tenant_id","user_id","app_id","grant_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "permission_grant" ADD CONSTRAINT "permission_grant_tenant_id_organization_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "organization"("tenant_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
