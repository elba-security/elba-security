CREATE TABLE IF NOT EXISTS "organisation" (
	"id" uuid PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"organization_slug" text NOT NULL,
	"region" text NOT NULL
);

