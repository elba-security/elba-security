CREATE TABLE IF NOT EXISTS "organisations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"region" text NOT NULL,
	"instance_id" text NOT NULL,
	"instance_url" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" text NOT NULL,
	"organisation_id" uuid NOT NULL,
	"last_sync_at" timestamp NOT NULL,
	"public_name" text NOT NULL,
	"display_name" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_organisation_id_id_unique" UNIQUE("organisation_id","id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "users" ADD CONSTRAINT "users_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
