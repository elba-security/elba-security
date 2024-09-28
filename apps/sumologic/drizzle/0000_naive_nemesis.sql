CREATE TABLE IF NOT EXISTS "organisation" (
	"id" uuid PRIMARY KEY NOT NULL,
	"region" text NOT NULL,
	"accessId" text NOT NULL,
	"accessKey" text NOT NULL,
	"sourceRegion" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
