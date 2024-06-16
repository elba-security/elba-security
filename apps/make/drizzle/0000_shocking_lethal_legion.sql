CREATE TABLE IF NOT EXISTS "organisation" (
	"id" uuid PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"zone_domain" text NOT NULL,
	"organization_ids" text[] NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"region" text NOT NULL
);

