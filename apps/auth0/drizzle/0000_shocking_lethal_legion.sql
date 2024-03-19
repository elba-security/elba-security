CREATE TABLE IF NOT EXISTS "organisation" (
	"id" uuid PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"client_secret" text NOT NULL,
	"domain" text NOT NULL,
	"audience" timestamp DEFAULT now() NOT NULL,
	"source_organization_id" text NOT NULL,
	"region" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
