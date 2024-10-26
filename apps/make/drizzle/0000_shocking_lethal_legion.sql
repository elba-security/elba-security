CREATE TABLE IF NOT EXISTS "organisations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"zone_domain" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"region" text NOT NULL
);

