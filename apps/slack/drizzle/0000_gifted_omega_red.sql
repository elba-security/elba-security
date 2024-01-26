CREATE TABLE IF NOT EXISTS "conversations" (
	"team_id" text NOT NULL,
	"id" text NOT NULL,
	"name" text NOT NULL,
	"is_shared_externally" boolean NOT NULL,
	"last_synced_at" timestamp with time zone NOT NULL,
	CONSTRAINT "conversations_team_id_id_pk" PRIMARY KEY("team_id","id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "teams" (
	"id" text PRIMARY KEY NOT NULL,
	"elba_organisation_id" text NOT NULL,
	"elba_region" text NOT NULL,
	"url" text NOT NULL,
	"token" text NOT NULL,
	"admin_id" text NOT NULL,
	CONSTRAINT "teams_elba_organisation_id_unique" UNIQUE("elba_organisation_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "conversations" ADD CONSTRAINT "conversations_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE restrict;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
