CREATE TABLE IF NOT EXISTS "organisations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text NOT NULL,
	"admin_team_member_id" text NOT NULL,
	"root_namespace_id" text NOT NULL,
	"region" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "shared_links" (
	"id" text NOT NULL,
	"url" text NOT NULL,
	"organisation_id" uuid NOT NULL,
	"team_member_id" text NOT NULL,
	"link_access_level" text NOT NULL,
	"path_lower" text NOT NULL,
	CONSTRAINT "shared_links_url_path_lower_pk" PRIMARY KEY("url", "path_lower")
);
--> statement-breakpoint
DO $$ BEGIN
ALTER TABLE "shared_links"
ADD CONSTRAINT "shared_links_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE cascade ON UPDATE restrict;
EXCEPTION
WHEN duplicate_object THEN null;
END $$;