CREATE TABLE IF NOT EXISTS "admins" (
	"id" text PRIMARY KEY NOT NULL,
	"organisation_id" uuid NOT NULL,
	"last_sync_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "admins_organisation_id_id_unique" UNIQUE("organisation_id","id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "organisations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"region" text NOT NULL,
	"installation_id" integer NOT NULL,
	"account_login" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "organisations_installation_id_unique" UNIQUE("installation_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "admins" ADD CONSTRAINT "admins_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
