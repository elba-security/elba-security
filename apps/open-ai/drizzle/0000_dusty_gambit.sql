CREATE TABLE IF NOT EXISTS "organisation" (
	"id" uuid PRIMARY KEY NOT NULL,
	"region" text NOT NULL,
	"token" text NOT NULL,
	"source_organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
