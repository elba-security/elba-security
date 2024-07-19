CREATE TABLE IF NOT EXISTS "organisations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"access_id" text NOT NULL,
	"access_key" text NOT NULL,
	"source_region" text NOT NULL,
	"owner_id" text NOT NULL,
	"region" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
