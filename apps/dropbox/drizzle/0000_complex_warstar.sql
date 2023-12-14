CREATE TABLE IF NOT EXISTS "shared_links" (
	"url" text NOT NULL,
	"organisation_id" uuid NOT NULL,
	"team_member_id" text NOT NULL,
	"link_access_level" text NOT NULL,
	"path_lower" text NOT NULL,
	CONSTRAINT shared_links_url_path_lower_pk PRIMARY KEY("url","path_lower")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tokens" (
	"organisation_id" uuid PRIMARY KEY NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text NOT NULL,
	"team_name" text NOT NULL,
	"admin_team_member_id" text NOT NULL,
	"root_namespace_id" text NOT NULL,
	"unauthorized_at" timestamp,
	"refresh_after" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
