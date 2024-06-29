CREATE TABLE IF NOT EXISTS "organisations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text NOT NULL,
	"region" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "team_users" (
	"user_id" text NOT NULL,
	"team_id" text NOT NULL,
	"organisation_id" uuid NOT NULL,
	"last_sync_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "team_users_user_id_team_id_organisation_id_last_sync_at_unique" UNIQUE("user_id","team_id","organisation_id","last_sync_at")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "team_users" ADD CONSTRAINT "team_users_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
